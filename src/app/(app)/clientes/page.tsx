import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ContactCard } from "@/components/domain/contact-card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { requireUser } from "@/lib/auth/dal";
import { listClients, type ClientRow } from "@/lib/queries/contacts";
import { buildQueryString } from "@/lib/queries/pagination";

export const metadata: Metadata = {
  title: "Clientes",
};

type PageProps = {
  searchParams: Promise<{ q?: string; pagina?: string; mostrar?: string }>;
};

const COLUMNS: Array<Column<ClientRow>> = [
  {
    key: "nome",
    header: "Nome",
    cell: (row) => (
      <Link
        href={`/clientes/${row.id}`}
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
  {
    key: "interesses",
    header: "Interesses",
    hideOnSmall: true,
    cell: (row) => (
      <span className="line-clamp-1 max-w-64 text-muted">
        {row.interesses ?? "—"}
      </span>
    ),
  },
];

export default async function ClientesPage({ searchParams }: PageProps) {
  await requireUser();

  const params = await searchParams;
  const { rows, total, page, pageSize } = await listClients(params);

  const currentParams = {
    q: params.q,
    mostrar: params.mostrar,
  };

  const empty = params.q ? (
    <EmptyState
      icon={Users}
      title="Nenhum cliente encontrado"
      description={`A busca por "${params.q}" nao retornou resultados. Confira a grafia ou limpe a busca.`}
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Nenhum cliente cadastrado"
      description="Cadastre o primeiro cliente para vincular reservas, vendas e creditos ao historico dele."
      action={
        <Link href="/clientes/novo" className={buttonVariants({})}>
          <Plus className="size-4" aria-hidden="true" />
          Cadastrar cliente
        </Link>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Contatos, interesses e historico de cada cliente."
        action={
          <Link href="/clientes/novo" className={buttonVariants({})}>
            <Plus className="size-4" aria-hidden="true" />
            Novo cliente
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          label="Buscar clientes"
          placeholder="Nome, cidade ou Instagram"
          className="sm:max-w-sm"
        />

        <Link
          href={`/clientes${buildQueryString(currentParams, {
            mostrar: params.mostrar === "inativos" ? undefined : "inativos",
            pagina: undefined,
          })}`}
          className="text-sm text-info underline-offset-4 hover:underline"
        >
          {params.mostrar === "inativos"
            ? "Ocultar inativos"
            : "Mostrar inativos"}
        </Link>
      </div>

      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        caption="Lista de clientes"
        empty={empty}
        mobileCard={(row) => (
          <ContactCard
            href={`/clientes/${row.id}`}
            nome={row.nome}
            cidade={row.cidade}
            telefone={row.telefone}
            instagram={row.instagram}
            inativo={!row.ativo}
            extra={
              row.interesses ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {row.interesses}
                </p>
              ) : null
            }
          />
        )}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) =>
          `/clientes${buildQueryString(currentParams, { pagina: String(next) })}`
        }
      />
    </>
  );
}
