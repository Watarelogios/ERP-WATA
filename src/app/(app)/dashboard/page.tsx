import {
  BookmarkCheck,
  Clock,
  Handshake,
  Package,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MetricCard } from "@/components/domain/metric-card";
import { MonthlyChart } from "@/components/domain/monthly-chart";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/dal";
import { formatBRL } from "@/lib/money";
import {
  getActiveAlerts,
  getDashboardSummary,
  getMonthlySalesProfit,
  getSalesByOrigin,
  getStuckStock,
} from "@/lib/queries/dashboard";
import { getSettings } from "@/lib/queries/settings";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ALERTA_LABEL: Record<string, { titulo: string; href: string }> = {
  RESERVATION_DUE: { titulo: "Reserva a vencer", href: "/reservas" },
  CONSIGNMENT_DUE: { titulo: "Consignacao no prazo", href: "/estoque" },
  PAYOUT_PENDING: { titulo: "Repasse pendente", href: "/vendas" },
};

export default async function DashboardPage() {
  await requireUser();

  /*
   * Primeiro acesso (Secao 3): sem configuracao nao ha saldo inicial, e sem
   * saldo inicial o caixa nasce errado. A configuracao vem antes do resto.
   */
  const settings = await getSettings();

  if (!settings) {
    redirect("/configuracoes");
  }

  const [summary, mensal, origens, alertas, parados] = await Promise.all([
    getDashboardSummary(),
    getMonthlySalesProfit(6),
    getSalesByOrigin(),
    getActiveAlerts(),
    getStuckStock(5),
  ]);

  const semDados =
    summary.totalDisponivel === 0 &&
    summary.totalReservado === 0 &&
    summary.totalVendido === 0;

  if (semDados) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Os indicadores sao calculados a partir das operacoes registradas."
        />

        <EmptyState
          icon={Package}
          title="Nenhum relogio no sistema ainda"
          description="Cadastre o primeiro relogio ou registre uma oportunidade de compra. Assim que houver movimento, capital investido, valor de estoque, lucro e caixa aparecem aqui automaticamente."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/estoque/novo" className={buttonVariants()}>
                Cadastrar relogio
              </Link>
              <Link
                href="/compras/nova"
                className={buttonVariants({ variant: "secondary" })}
              >
                Registrar oportunidade
              </Link>
            </div>
          }
        />
      </>
    );
  }

  const alertasVencendo = alertas.filter(
    (alerta) => alerta.diasRestantes !== null && alerta.diasRestantes <= 7,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${settings.nomeLoja} · indicadores calculados a partir dos dados reais.`}
      />

      {/* Nenhum destes numeros e armazenado: todos vem das views (Secao 14). */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Caixa"
          value={formatBRL(summary.caixaCents)}
          context="Saldo inicial + entradas − saidas confirmadas"
          icon={Wallet}
          href="/financeiro"
        />

        <MetricCard
          label="Capital investido"
          value={formatBRL(summary.capitalInvestidoCents)}
          context="Compra + despesas dos itens proprios em estoque"
          icon={Package}
          href="/estoque"
        />

        <MetricCard
          label="Valor de estoque"
          value={formatBRL(summary.valorEstoqueCents)}
          context={`${summary.totalDisponivel} disponiveis · ${summary.totalReservado} reservados`}
          icon={TrendingUp}
          href="/estoque"
        />

        <MetricCard
          label="Lucro realizado"
          value={formatBRL(summary.lucroRealizadoCents)}
          context={`${summary.totalVendido} vendas concluidas`}
          icon={Receipt}
          href="/vendas"
          tone="success"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Lucro potencial"
          value={formatBRL(summary.lucroPotencialProprioCents)}
          context="Se os proprios venderem pelo valor anunciado"
        />

        <MetricCard
          label="Lucro minimo"
          value={formatBRL(summary.lucroMinimoProprioCents)}
          context="Se os proprios venderem pelo valor minimo"
        />

        <MetricCard
          label="Reservas ativas"
          value={String(summary.totalReservado)}
          context="Itens bloqueados aguardando retirada"
          icon={BookmarkCheck}
          href="/reservas"
        />

        <MetricCard
          label="Repasses pendentes"
          value={String(summary.repassesPendentes)}
          context="Ainda nao reduziram o caixa"
          icon={Handshake}
          href="/vendas"
          tone={summary.repassesPendentes > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendas e lucro por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart rows={mensal} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              {alertas.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma reserva a vencer, consignacao no prazo ou repasse
                  pendente.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {alertas.slice(0, 6).map((alerta) => {
                    const info = ALERTA_LABEL[alerta.tipo] ?? {
                      titulo: alerta.tipo,
                      href: "/dashboard",
                    };
                    const vencido =
                      alerta.diasRestantes !== null && alerta.diasRestantes < 0;

                    return (
                      <li key={`${alerta.tipo}-${alerta.referenciaId}`}>
                        <Link
                          href={info.href}
                          className="flex items-start justify-between gap-2 text-sm hover:underline"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-graphite-dark">
                              {info.titulo}
                            </span>
                            <span
                              className={
                                vencido
                                  ? "text-xs font-medium text-danger"
                                  : "text-xs text-muted"
                              }
                            >
                              {alerta.diasRestantes === null
                                ? "Aguardando pagamento"
                                : vencido
                                  ? `Vencido ha ${Math.abs(alerta.diasRestantes)} dia(s)`
                                  : `Em ${alerta.diasRestantes} dia(s)`}
                              {alerta.dataReferencia
                                ? ` · ${formatDate(alerta.dataReferencia)}`
                                : ""}
                            </span>
                          </span>

                          <span
                            className="shrink-0 text-sm tabular-nums"
                            data-money
                          >
                            {formatBRL(alerta.valorCents)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {alertasVencendo.length > 0 ? (
                <p className="mt-3 border-t border-border pt-2 text-xs text-warning">
                  {alertasVencendo.length} item(ns) vencem nos proximos 7 dias.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas por canal</CardTitle>
            </CardHeader>
            <CardContent>
              {origens.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma venda registrada ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {origens.map((origem) => (
                    <li
                      key={origem.origem}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {origem.origem}
                        <span className="ml-1.5 text-xs text-muted">
                          ({origem.quantidade})
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums" data-money>
                        {formatBRL(origem.valorCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {parados.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>
              Parados ha mais de {settings.diasEstoqueParado} dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parados.map((item) => (
                <li key={item.watchId}>
                  <Link
                    href={`/estoque/${item.watchId}`}
                    className="flex items-center justify-between gap-3 text-sm hover:underline"
                  >
                    <span className="min-w-0 truncate">
                      {item.marca} {item.modelo}
                      <span className="ml-1.5 text-xs text-muted">
                        {item.wataId}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {item.diasEmEstoque}d
                      </span>
                      <span className="tabular-nums" data-money>
                        {formatBRL(item.valorAnunciadoCents)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
