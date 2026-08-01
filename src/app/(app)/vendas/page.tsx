import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PayPayoutDialog } from "@/components/domain/pay-payout-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { WATCH_TYPE } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { buildQueryString } from "@/lib/queries/pagination";
import { listPayouts, listSales, type SaleRow } from "@/lib/queries/sales";
import { formatDate, hojeISO } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Vendas",
};

type VendasPageProps = {
  searchParams: Promise<{ pagina?: string }>;
};

function SaleCard({ row }: { row: SaleRow }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {row.watch ? (
            <Link
              href={`/estoque/${row.watch.id}`}
              className="truncate font-medium text-graphite-dark hover:underline"
            >
              {row.watch.marca} {row.watch.modelo}
            </Link>
          ) : (
            <p className="font-medium text-graphite-dark">Relogio removido</p>
          )}
          <p className="truncate text-xs text-muted">
            {row.watch?.wata_id}
            {row.client ? ` · ${row.client.nome}` : null}
          </p>
        </div>

        {row.watch ? (
          <StatusChip status={WATCH_TYPE[row.watch.tipo]} hideDot />
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Valor</dt>
        <dd className="text-right font-medium tabular-nums" data-money>
          {formatBRL(toCents(row.valor_venda))}
        </dd>

        <dt className="text-muted">Lucro liquido</dt>
        <dd className="text-right font-medium tabular-nums text-success" data-money>
          {formatBRL(toCents(row.lucro_liquido))}
        </dd>
      </dl>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span>{formatDate(row.data_venda)}</span>
        {row.origem ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{row.origem}</span>
          </>
        ) : null}
        {row.forma_pagamento ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{row.forma_pagamento}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export default async function VendasPage({ searchParams }: VendasPageProps) {
  await requireUser();

  const params = await searchParams;
  const [{ rows, total, page, pageSize }, pendentes, summary] =
    await Promise.all([
      listSales(params),
      listPayouts("PENDING"),
      getDashboardSummary(),
    ]);

  const hoje = hojeISO();

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Historico de vendas com cliente, valor, lucro e origem."
      />

      {/* Repasses pendentes sao obrigacao em aberto: aparecem antes do historico. */}
      {pendentes.length > 0 ? (
        <Card className="mb-4 border-warning/30">
          <CardHeader className="border-warning/30">
            <CardTitle>
              Repasses pendentes ({pendentes.length})
            </CardTitle>
            <p className="mt-1 text-sm text-muted">
              Repasse pendente nao reduz o caixa. A saida acontece ao registrar o
              pagamento.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {pendentes.map((payout) => (
              <div
                key={payout.id}
                className="flex flex-col gap-3 rounded-md bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-graphite-dark">
                    {payout.supplier?.nome ?? "Consignante"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {payout.sale?.watch
                      ? `${payout.sale.watch.marca} ${payout.sale.watch.modelo} · ${payout.sale.watch.wata_id}`
                      : "Relogio removido"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span
                    className="text-sm font-medium tabular-nums"
                    data-money
                  >
                    {formatBRL(toCents(payout.valor))}
                  </span>

                  <PayPayoutDialog
                    payoutId={payout.id}
                    valorCents={toCents(payout.valor)}
                    supplierNome={payout.supplier?.nome ?? "Consignante"}
                    watchLabel={
                      payout.sale?.watch
                        ? `${payout.sale.watch.marca} ${payout.sale.watch.modelo}`
                        : "item consignado"
                    }
                    caixaAtualCents={summary.caixaCents}
                    hoje={hoje}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma venda registrada"
          description="A venda a vista e concluida a partir do relogio no estoque. O item sai do estoque ativo, mas o historico continua ligado a ele."
          action={
            <Link href="/estoque" className={buttonVariants()}>
              Ir para o estoque
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id}>
              <SaleCard row={row} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/vendas${buildQueryString({ pagina: params.pagina }, { pagina: String(next) })}`
        }
      />
    </>
  );
}
