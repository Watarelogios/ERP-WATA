import { Handshake, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { PURCHASE_STATUS } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { buildQueryString } from "@/lib/queries/pagination";
import {
  countOpportunitiesByStatus,
  listOpportunities,
  type OpportunityRow,
} from "@/lib/queries/purchases";

export const metadata: Metadata = {
  title: "Compras",
};

type ComprasPageProps = {
  searchParams: Promise<{ q?: string; status?: string; pagina?: string }>;
};

function OpportunityCard({ row }: { row: OpportunityRow }) {
  return (
    <Link
      href={`/compras/${row.id}`}
      className="block rounded-card border border-border bg-white p-4 hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-graphite-dark">{row.modelo}</p>
          {row.referencia ? (
            <p className="truncate text-xs text-muted">Ref. {row.referencia}</p>
          ) : null}
        </div>

        <StatusChip status={PURCHASE_STATUS[row.status]} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {row.valor_pedido !== null ? (
          <>
            <dt className="text-muted">Pedido</dt>
            <dd className="text-right tabular-nums" data-money>
              {formatBRL(toCents(row.valor_pedido))}
            </dd>
          </>
        ) : null}

        {row.status === "PURCHASED" && row.valor_fechado !== null ? (
          <>
            <dt className="text-muted">Fechado</dt>
            <dd className="text-right font-medium tabular-nums" data-money>
              {formatBRL(toCents(row.valor_fechado))}
            </dd>
          </>
        ) : row.minha_oferta !== null ? (
          <>
            <dt className="text-muted">Minha oferta</dt>
            <dd className="text-right tabular-nums" data-money>
              {formatBRL(toCents(row.minha_oferta))}
            </dd>
          </>
        ) : null}
      </dl>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted">
        {row.supplier ? <span>{row.supplier.nome}</span> : null}
        {row.supplier && row.cidade ? <span aria-hidden="true">·</span> : null}
        {row.cidade ? <span>{row.cidade}</span> : null}
        {row.watch ? (
          <span className="font-medium text-graphite">
            Virou {row.watch.wata_id}
          </span>
        ) : null}
      </p>
    </Link>
  );
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  await requireUser();

  const params = await searchParams;
  const [{ rows, total, page, pageSize }, counts] = await Promise.all([
    listOpportunities(params),
    countOpportunitiesByStatus(),
  ]);

  const current = {
    q: params.q,
    status: params.status,
    pagina: params.pagina,
  };

  const filtros = [
    { value: undefined, label: "Todas", count: undefined },
    { value: "NEGOTIATING", label: "Negociando", count: counts.NEGOTIATING },
    { value: "PURCHASED", label: "Compradas", count: counts.PURCHASED },
    { value: "LOST", label: "Perdidas", count: counts.LOST },
  ];

  const temFiltro = Boolean(params.q || params.status);

  return (
    <>
      <PageHeader
        title="Compras"
        description="Oportunidades em negociacao. Confirmar a compra cria o relogio no estoque e a saida no caixa."
        action={
          <Link href="/compras/nova" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden="true" />
            Nova oportunidade
          </Link>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput
          label="Buscar oportunidade"
          placeholder="Buscar por modelo ou referencia..."
          className="max-w-md"
        />

        <div className="flex flex-wrap items-center gap-2">
          {filtros.map((filtro) => (
            <FilterChip
              key={filtro.label}
              href={`/compras${buildQueryString(current, { status: filtro.value, pagina: undefined })}`}
              active={params.status === filtro.value}
              count={filtro.count}
            >
              {filtro.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={
            temFiltro
              ? "Nenhuma oportunidade encontrada"
              : "Nenhuma oportunidade cadastrada"
          }
          description={
            temFiltro
              ? "Ajuste a busca ou os filtros para ver outras negociacoes."
              : "Registre uma negociacao em andamento. Ao confirmar a compra, o relogio entra no estoque com WATA-ID e a saida e lancada no caixa automaticamente."
          }
          action={
            temFiltro ? (
              <Link
                href="/compras"
                className={buttonVariants({ variant: "secondary" })}
              >
                Limpar filtros
              </Link>
            ) : (
              <Link href="/compras/nova" className={buttonVariants()}>
                <Plus className="size-4" aria-hidden="true" />
                Nova oportunidade
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id}>
              <OpportunityCard row={row} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/compras${buildQueryString(current, { pagina: String(next) })}`
        }
      />
    </>
  );
}
