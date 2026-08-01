import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Habilita ordenacao por esta coluna; o valor vai para a URL. */
  sortKey?: string;
  /** Alinha a direita e aplica algarismos tabulares (valores monetarios). */
  numeric?: boolean;
  /** Esconde em telas menores que lg, sem sumir do card do celular. */
  hideOnSmall?: boolean;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Array<Column<T>>;
  rowKey: (row: T) => string;
  /** Card usado no celular; a tabela vira lista para evitar rolagem lateral. */
  mobileCard: (row: T) => ReactNode;
  /** Estado vazio: explica e oferece uma saida. */
  empty: ReactNode;
  /** Ordenacao atual, para desenhar a seta e alternar a direcao. */
  sort?: { key: string; direction: "asc" | "desc" };
  /** Base da URL usada nos links de ordenacao, com os filtros ja aplicados. */
  buildSortHref?: (key: string, direction: "asc" | "desc") => string;
  caption?: string;
};

/**
 * Tabela no desktop, cards no celular (Secao 16.2).
 *
 * A ordenacao acontece por link, e nao por estado no cliente: a consulta e
 * refeita no servidor, entao a tela nunca precisa carregar a base inteira para
 * reordenar (Secao 14).
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  mobileCard,
  empty,
  sort,
  buildSortHref,
  caption,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <>
      {/* Celular: lista de cards. */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{mobileCard(row)}</li>
        ))}
      </ul>

      {/* Desktop: tabela. */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-white lg:block">
        <table className="w-full text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => {
                const isSorted = sort?.key === column.sortKey;
                const nextDirection =
                  isSorted && sort?.direction === "asc" ? "desc" : "asc";

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted
                        ? sort?.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-medium text-muted",
                      column.numeric && "text-right",
                      column.hideOnSmall && "hidden xl:table-cell",
                    )}
                  >
                    {column.sortKey && buildSortHref ? (
                      <Link
                        href={buildSortHref(column.sortKey, nextDirection)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-graphite",
                          isSorted && "text-graphite",
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort?.direction === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown
                            className="size-3 opacity-40"
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border last:border-0 hover:bg-surface"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-numeric={column.numeric ? "" : undefined}
                    className={cn(
                      "px-4 py-3 align-middle",
                      column.numeric && "text-right",
                      column.hideOnSmall && "hidden xl:table-cell",
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
