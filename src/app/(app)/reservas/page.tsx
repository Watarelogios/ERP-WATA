import { BookmarkCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CancelReservationDialog } from "@/components/domain/cancel-reservation-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { DEPOSIT_FATE, RESERVATION_STATUS } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { buildQueryString } from "@/lib/queries/pagination";
import {
  countReservations,
  DIAS_A_VENCER,
  listReservations,
  type ReservationRow,
} from "@/lib/queries/reservations";

export const metadata: Metadata = {
  title: "Reservas",
};

type ReservasPageProps = {
  searchParams: Promise<{ status?: string; pagina?: string }>;
};

function diasRestantes(validade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(`${validade}T00:00:00`);

  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

function ReservationCard({ row }: { row: ReservationRow }) {
  const ativa = row.status === "ACTIVE";
  const dias = diasRestantes(row.validade);
  const vencida = ativa && dias < 0;
  const aVencer = ativa && dias >= 0 && dias <= DIAS_A_VENCER;

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

        <StatusChip status={RESERVATION_STATUS[row.status]} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Combinado</dt>
        <dd className="text-right tabular-nums" data-money>
          {formatBRL(toCents(row.valor_combinado))}
        </dd>

        {row.valor_sinal > 0 ? (
          <>
            <dt className="text-muted">Sinal recebido</dt>
            <dd className="text-right tabular-nums" data-money>
              {formatBRL(toCents(row.valor_sinal))}
            </dd>

            <dt className="text-muted">Saldo restante</dt>
            <dd className="text-right font-medium tabular-nums" data-money>
              {formatBRL(toCents(row.saldo_restante))}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-muted">Sinal</dt>
            <dd className="text-right text-muted">Sem sinal</dd>
          </>
        )}
      </dl>

      <p className="mt-3 text-xs text-muted">
        {ativa ? (
          vencida ? (
            <span className="font-medium text-danger">
              Vencida ha {Math.abs(dias)} dia{Math.abs(dias) === 1 ? "" : "s"}
            </span>
          ) : aVencer ? (
            <span className="font-medium text-warning">
              Vence em {dias} dia{dias === 1 ? "" : "s"}
            </span>
          ) : (
            <>Vale ate {row.validade}</>
          )
        ) : row.destino_sinal ? (
          <>Sinal: {DEPOSIT_FATE[row.destino_sinal].label}</>
        ) : (
          <>Encerrada</>
        )}
      </p>

      {ativa ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <CancelReservationDialog
            reservationId={row.id}
            valorSinalCents={toCents(row.valor_sinal)}
            subject={`${row.watch?.marca ?? ""} ${row.watch?.modelo ?? ""} · ${row.watch?.wata_id ?? ""}`}
          />
        </div>
      ) : null}
    </div>
  );
}

export default async function ReservasPage({ searchParams }: ReservasPageProps) {
  await requireUser();

  const params = await searchParams;
  const [{ rows, total, page, pageSize }, counts] = await Promise.all([
    listReservations(params),
    countReservations(),
  ]);

  const current = { status: params.status, pagina: params.pagina };

  const filtros = [
    { value: undefined, label: "Todas", count: undefined },
    { value: "ACTIVE", label: "Ativas", count: counts.ativas },
    { value: "HISTORICO", label: "Historico", count: counts.historico },
  ];

  return (
    <>
      <PageHeader
        title="Reservas"
        description="Uma reserva bloqueia o relogio. O sinal, quando existe, entra no caixa na hora e nao e cobrado de novo na venda."
      />

      {counts.aVencer > 0 ? (
        <Alert tone="warning" title="Reservas proximas do vencimento" className="mb-4">
          {counts.aVencer} reserva{counts.aVencer === 1 ? "" : "s"} vence
          {counts.aVencer === 1 ? "" : "m"} nos proximos {DIAS_A_VENCER} dias.
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filtros.map((filtro) => (
          <FilterChip
            key={filtro.label}
            href={`/reservas${buildQueryString(current, { status: filtro.value, pagina: undefined })}`}
            active={params.status === filtro.value}
            count={filtro.count}
          >
            {filtro.label}
          </FilterChip>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="Nenhuma reserva por aqui"
          description="Reservas sao criadas a partir de um relogio disponivel no estoque. O item fica bloqueado ate a venda ou o cancelamento."
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
              <ReservationCard row={row} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/reservas${buildQueryString(current, { pagina: String(next) })}`
        }
      />
    </>
  );
}
