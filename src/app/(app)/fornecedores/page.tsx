import { Plus, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ContactCard } from "@/components/domain/contact-card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { SUPPLIER_RELATION } from "@/lib/labels";
import { listSuppliers, type SupplierRow } from "@/lib/queries/contacts";
import { buildQueryString } from "@/lib/queries/pagination";
import type { Enums } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Fornecedores",
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    pagina?: string;
    mostrar?: string;
    tipo?: Enums<"supplier_relation">;
  }>;
};

const FILTERS: Array<{
  value: Enums<"supplier_relation"> | undefined;
  label: string;
}> = [
  { value: undefined, label: "Todos" },
  { value: "SELLER", label: "Vendedores" },
  { value: "CONSIGNOR", label: "Consignantes" },
];

const COLUMNS: Array<Column<SupplierRow>> = [
  {
    key: "nome",
    header: "Nome",
    cell: (row) => (
      <Link
        href={`/fornecedores/${row.id}`}
        className="font-medium text-graphite-dark hover:underline"
      >
        {row.nome}
        {!row.ativo ? (
          <span className="ml-2 text-xs text-muted">(inativo)</span>
        ) : null}
      </Link>
    ),
  },
  {
    key: "tipo",
    header: "Tipo",
    cell: (row) => <StatusChip status={SUPPLIER_RELATION[row.tipo_relacao]} />,
  },
  {
    key: "cidade",
    header: "Cidade",
    cell: (row) => row.cidade ?? "—",
  },
  {
    key: "telefone",
    header: "Telefone",
    cell: (row) => <span className="tabular-nums">{row.telefone ?? "—"}</span>,
  },
  {
    key: "instagram",
    header: "Instagram",
    hideOnSmall: true,
    cell: (row) => (row.instagram ? `@${row.instagram}` : "—"),
  },
];

export default async function FornecedoresPage({ searchParams }: PageProps) {
  await requireUser();

  const params = await searchParams;
  const { rows, total, page, pageSize } = await listSuppliers(params);

  const currentParams = {
    q: params.q,
    mostrar: params.mostrar,
    tipo: params.tipo,
  };

  const empty = params.q ? (
    <EmptyState
      icon={Truck}
      title="Nenhum fornecedor encontrado"
      description={`A busca por "${params.q}" nao retornou resultados. Confira a grafia ou limpe a busca.`}
    />
  ) : (
    <EmptyState
      icon={Truck}
      title="Nenhum fornecedor cadastrado"
      description="Cadastre vendedores e consignantes para vincular a origem dos relogios e controlar os repasses."
      action={
        <Link href="/fornecedores/novo" className={buttonVariants({})}>
          <Plus className="size-4" aria-hidden="true" />
          Cadastrar fornecedor
        </Link>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Vendedores, consignantes, itens vinculados e repasses."
        action={
          <Link href="/fornecedores/novo" className={buttonVariants({})}>
            <Plus className="size-4" aria-hidden="true" />
            Novo fornecedor
          </Link>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput
          label="Buscar fornecedores"
          placeholder="Nome, cidade ou Instagram"
          className="sm:max-w-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => {
            const active = params.tipo === filter.value;

            return (
              <Link
                key={filter.label}
                href={`/fornecedores${buildQueryString(currentParams, {
                  tipo: filter.value,
                  pagina: undefined,
                })}`}
                aria-current={active ? "true" : undefined}
                className={
                  active
                    ? "rounded-full bg-graphite px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-graphite hover:bg-surface"
                }
              >
                {filter.label}
              </Link>
            );
          })}

          <Link
            href={`/fornecedores${buildQueryString(currentParams, {
              mostrar: params.mostrar === "inativos" ? undefined : "inativos",
              pagina: undefined,
            })}`}
            className="ml-1 text-sm text-info underline-offset-4 hover:underline"
          >
            {params.mostrar === "inativos"
              ? "Ocultar inativos"
              : "Mostrar inativos"}
          </Link>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        caption="Lista de fornecedores"
        empty={empty}
        mobileCard={(row) => (
          <ContactCard
            href={`/fornecedores/${row.id}`}
            nome={row.nome}
            cidade={row.cidade}
            telefone={row.telefone}
            instagram={row.instagram}
            chip={SUPPLIER_RELATION[row.tipo_relacao]}
            inativo={!row.ativo}
          />
        )}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/fornecedores${buildQueryString(currentParams, {
            pagina: String(next),
          })}`
        }
      />
    </>
  );
}
