import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ManualTransactionForm } from "@/app/(app)/financeiro/manual-transaction-form";
import { ReverseTransactionButton } from "@/components/domain/reverse-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { FINANCIAL_CATEGORY, FINANCIAL_STATUS } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import {
  getPeriodTotals,
  listTransactions,
  type TransactionRow,
} from "@/lib/queries/financial";
import { buildQueryString } from "@/lib/queries/pagination";
import { getSettings } from "@/lib/queries/settings";
import { formatDate, hojeISO } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Financeiro",
};

type FinanceiroPageProps = {
  searchParams: Promise<{
    direcao?: string;
    status?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  }>;
};

/** Estorno so vale para lancamento avulso; operacoes tem fluxo proprio. */
function podeEstornar(row: TransactionRow): boolean {
  return (
    row.status === "CONFIRMED" &&
    row.payout_id === null &&
    !["SALE", "RESERVATION_DEPOSIT", "RETAINED_DEPOSIT"].includes(row.categoria)
  );
}

function TransactionRowItem({ row }: { row: TransactionRow }) {
  const entrada = row.direcao === "INCOME";
  const estornado = row.status === "REVERSED";

  return (
    <li className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-graphite-dark">
            {FINANCIAL_CATEGORY[row.categoria].label}
          </span>
          {row.status !== "CONFIRMED" ? (
            <StatusChip status={FINANCIAL_STATUS[row.status]} />
          ) : null}
        </p>

        {row.descricao ? (
          <p className="mt-0.5 break-words text-xs text-muted">{row.descricao}</p>
        ) : null}

        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span>{formatDate(row.data)}</span>
          {row.watch ? (
            <>
              <span aria-hidden="true">·</span>
              <Link href={`/estoque/${row.watch.id}`} className="hover:underline">
                {row.watch.wata_id}
              </Link>
            </>
          ) : null}
          {row.client ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{row.client.nome}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={
            estornado
              ? "text-sm tabular-nums text-muted line-through"
              : entrada
                ? "text-sm font-medium tabular-nums text-success"
                : "text-sm font-medium tabular-nums text-danger"
          }
          data-money
        >
          {entrada ? "+" : "−"} {formatBRL(toCents(row.valor))}
        </span>

        {podeEstornar(row) ? (
          <ReverseTransactionButton
            transactionId={row.id}
            descricao={row.descricao ?? FINANCIAL_CATEGORY[row.categoria].label}
            valorCents={toCents(row.valor)}
            entrada={entrada}
          />
        ) : null}
      </div>
    </li>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: FinanceiroPageProps) {
  await requireUser();

  const params = await searchParams;

  const [{ rows, total, page, pageSize }, totals, summary, settings] =
    await Promise.all([
      listTransactions(params),
      getPeriodTotals(params),
      getDashboardSummary(),
      getSettings(),
    ]);

  const current = {
    direcao: params.direcao,
    status: params.status,
    de: params.de,
    ate: params.ate,
    pagina: params.pagina,
  };

  const saldoInicial = settings?.saldoInicialCents ?? 0;
  const temPeriodo = Boolean(params.de || params.ate);
  const hoje = hojeISO();

  const filtrosDirecao = [
    { value: undefined, label: "Tudo" },
    { value: "INCOME", label: "Entradas" },
    { value: "EXPENSE", label: "Saidas" },
  ];

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Livro caixa. Todo valor que entra ou sai da WATA passa por aqui."
      />

      {/*
        Saldo explicavel: a conta aparece parcela por parcela, em vez de mostrar
        apenas o numero final.
      */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Como o saldo se forma</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Saldo inicial</dt>
              <dd className="tabular-nums" data-money>
                {formatBRL(saldoInicial)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                Entradas confirmadas{temPeriodo ? " no periodo" : ""}
              </dt>
              <dd className="tabular-nums text-success" data-money>
                + {formatBRL(totals.entradasCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                Saidas confirmadas{temPeriodo ? " no periodo" : ""}
              </dt>
              <dd className="tabular-nums text-danger" data-money>
                − {formatBRL(totals.saidasCents)}
              </dd>
            </div>

            <div className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="font-medium">Saldo em caixa</dt>
              <dd className="text-base font-semibold tabular-nums" data-money>
                {formatBRL(summary.caixaCents)}
              </dd>
            </div>

            {totals.pendentesCents > 0 ? (
              <div className="flex justify-between gap-3 text-xs">
                <dt className="text-muted">Pendentes (fora do saldo)</dt>
                <dd className="tabular-nums text-warning" data-money>
                  {formatBRL(totals.pendentesCents)}
                </dd>
              </div>
            ) : null}
          </dl>

          {temPeriodo ? (
            <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
              O saldo em caixa considera todo o historico; os totais acima
              refletem apenas o periodo filtrado.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {/* Filtros na URL: o resultado e compartilhavel e sobrevive ao recarregar. */}
        <form className="flex flex-wrap items-end gap-2">
          {params.direcao ? (
            <input type="hidden" name="direcao" value={params.direcao} />
          ) : null}

          <label className="text-xs text-muted">
            De
            <input
              type="date"
              name="de"
              defaultValue={params.de ?? ""}
              max={hoje}
              className="mt-1 block h-11 rounded-md border border-border bg-white px-3 text-sm"
            />
          </label>

          <label className="text-xs text-muted">
            Ate
            <input
              type="date"
              name="ate"
              defaultValue={params.ate ?? ""}
              max={hoje}
              className="mt-1 block h-11 rounded-md border border-border bg-white px-3 text-sm"
            />
          </label>

          <button
            type="submit"
            className="h-11 rounded-md border border-border bg-white px-4 text-sm font-medium text-graphite hover:bg-surface"
          >
            Filtrar
          </button>

          {temPeriodo ? (
            <Link
              href={`/financeiro${buildQueryString(current, { de: undefined, ate: undefined, pagina: undefined })}`}
              className="px-2 pb-3 text-sm text-info underline-offset-4 hover:underline"
            >
              Limpar periodo
            </Link>
          ) : null}
        </form>

        <ManualTransactionForm hoje={hoje} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filtrosDirecao.map((filtro) => (
          <FilterChip
            key={filtro.label}
            href={`/financeiro${buildQueryString(current, { direcao: filtro.value, pagina: undefined })}`}
            active={params.direcao === filtro.value}
          >
            {filtro.label}
          </FilterChip>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum lancamento no periodo"
          description="Compras, sinais, vendas e repasses geram lancamentos automaticamente. Despesas avulsas, como anuncios, podem ser registradas aqui."
        />
      ) : (
        <Card>
          <ul>
            {rows.map((row) => (
              <TransactionRowItem key={row.id} row={row} />
            ))}
          </ul>
        </Card>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/financeiro${buildQueryString(current, { pagina: String(next) })}`
        }
      />
    </>
  );
}
