import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Monta a URL da pagina mantendo busca, filtros e ordenacao. */
  buildHref: (page: number) => string;
};

export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return null;
  }

  const primeiro = (page - 1) * pageSize + 1;
  const ultimo = Math.min(page * pageSize, total);

  const temAnterior = page > 1;
  const temProxima = page < lastPage;

  return (
    <nav
      aria-label="Paginacao"
      className="mt-4 flex items-center justify-between gap-3"
    >
      <p className="text-sm text-muted" aria-live="polite">
        <span className="tabular-nums">
          {primeiro}-{ultimo}
        </span>{" "}
        de <span className="tabular-nums">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        {temAnterior ? (
          <Link
            href={buildHref(page - 1)}
            rel="prev"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "pointer-events-none opacity-50",
            )}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </span>
        )}

        {temProxima ? (
          <Link
            href={buildHref(page + 1)}
            rel="next"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Proxima
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "pointer-events-none opacity-50",
            )}
          >
            Proxima
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
