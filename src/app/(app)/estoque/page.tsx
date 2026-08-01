import { Plus, Watch as WatchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { WatchCard } from "@/components/domain/watch-card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { requireUser } from "@/lib/auth/dal";
import { WATCH_STATUS, WATCH_TYPE, toOptions } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { buildQueryString } from "@/lib/queries/pagination";
import { listWatches, type WatchListParams } from "@/lib/queries/watches";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/storage/photos";

export const metadata: Metadata = {
  title: "Estoque",
};

type PageProps = {
  searchParams: Promise<WatchListParams>;
};

const SORT_OPTIONS = [
  { value: "entrada", label: "Entrada (recentes)" },
  { value: "entrada-asc", label: "Entrada (antigos)" },
  { value: "preco", label: "Preco (maior)" },
  { value: "preco-asc", label: "Preco (menor)" },
  { value: "marca", label: "Marca (A-Z)" },
];

export default async function EstoquePage({ searchParams }: PageProps) {
  await requireUser();

  const params = await searchParams;
  const { rows, total, page, pageSize, marcas } = await listWatches(params);

  // URLs assinadas das capas, geradas de uma vez para a pagina inteira.
  const supabase = await createSupabaseServerClient();
  const coverUrls = await signPhotoUrls(
    supabase,
    rows.map((row) => row.cover_path).filter((path): path is string => !!path),
  );

  const currentParams: Record<string, string | undefined> = {
    q: params.q,
    status: params.status,
    tipo: params.tipo,
    marca: params.marca,
    fornecedor: params.fornecedor,
    ordem: params.ordem,
  };

  const hasFilters = Boolean(
    params.q || params.status || params.tipo || params.marca,
  );

  const empty = hasFilters ? (
    <EmptyState
      icon={WatchIcon}
      title="Nenhum relogio encontrado"
      description="Nenhum item corresponde a busca e aos filtros atuais."
      action={
        <Link href="/estoque" className={buttonVariants({ variant: "secondary" })}>
          Limpar filtros
        </Link>
      }
    />
  ) : (
    <EmptyState
      icon={WatchIcon}
      title="Nenhum relogio cadastrado"
      description="Cadastre o primeiro relogio para comecar. Ele recebe automaticamente o codigo WATA-0001."
      action={
        <Link href="/estoque/novo" className={buttonVariants({})}>
          <Plus className="size-4" aria-hidden="true" />
          Cadastrar relogio
        </Link>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Relogios proprios e consignados, com fotos, filtros e acoes rapidas."
        action={
          <Link href="/estoque/novo" className={buttonVariants({})}>
            <Plus className="size-4" aria-hidden="true" />
            Novo relogio
          </Link>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput
          label="Buscar no estoque"
          placeholder="WATA-ID, marca, modelo ou referencia"
          className="sm:max-w-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Status:</span>
          <FilterChip
            href={`/estoque${buildQueryString(currentParams, { status: undefined, pagina: undefined })}`}
            active={!params.status}
          >
            Todos
          </FilterChip>
          {toOptions(WATCH_STATUS).map((option) => (
            <FilterChip
              key={option.value}
              href={`/estoque${buildQueryString(currentParams, { status: option.value, pagina: undefined })}`}
              active={params.status === option.value}
            >
              {option.label}
            </FilterChip>
          ))}

          <span className="ml-2 text-xs font-medium text-muted">Tipo:</span>
          <FilterChip
            href={`/estoque${buildQueryString(currentParams, { tipo: undefined, pagina: undefined })}`}
            active={!params.tipo}
          >
            Todos
          </FilterChip>
          {toOptions(WATCH_TYPE).map((option) => (
            <FilterChip
              key={option.value}
              href={`/estoque${buildQueryString(currentParams, { tipo: option.value, pagina: undefined })}`}
              active={params.tipo === option.value}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        {marcas.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Marca:</span>
            <FilterChip
              href={`/estoque${buildQueryString(currentParams, { marca: undefined, pagina: undefined })}`}
              active={!params.marca}
            >
              Todas
            </FilterChip>
            {marcas.map((marca) => (
              <FilterChip
                key={marca}
                href={`/estoque${buildQueryString(currentParams, { marca, pagina: undefined })}`}
                active={params.marca === marca}
              >
                {marca}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Ordenar:</span>
          {SORT_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              href={`/estoque${buildQueryString(currentParams, { ordem: option.value, pagina: undefined })}`}
              active={(params.ordem ?? "entrada") === option.value}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        empty
      ) : (
        <>
          {/* Grade de cards com foto em todas as larguras (Secao 15.1). */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => (
              <li key={row.id}>
                <WatchCard
                  watch={row}
                  coverUrl={
                    row.cover_path
                      ? (coverUrls.get(row.cover_path) ?? null)
                      : null
                  }
                />
              </li>
            ))}
          </ul>

          {/* Resumo textual da pagina para leitores de tela. */}
          <p className="sr-only" aria-live="polite">
            {rows.length} relogios exibidos.{" "}
            {rows
              .map(
                (row) =>
                  `${row.wata_id} ${row.marca} ${row.modelo} ${
                    row.valor_anunciado
                      ? formatBRL(toCents(row.valor_anunciado))
                      : ""
                  }`,
              )
              .join("; ")}
          </p>
        </>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/estoque${buildQueryString(currentParams, { pagina: String(next) })}`
        }
      />
    </>
  );
}
