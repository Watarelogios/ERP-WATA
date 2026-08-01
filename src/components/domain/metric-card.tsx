import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export type MetricCardProps = {
  label: string;
  value: string;
  /** Explicacao curta de como o numero e formado. */
  context?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "success" | "warning";
};

/**
 * Indicador do dashboard (Secao 16.1).
 *
 * O contexto e parte do componente, nao enfeite: um numero de caixa sem dizer
 * de onde vem nao permite conferir nada.
 */
export function MetricCard({
  label,
  value,
  context,
  icon: Icon,
  href,
  tone = "default",
}: MetricCardProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
        ) : null}
      </div>

      <p
        className={cn(
          "mt-2 text-xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
        data-money
      >
        {value}
      </p>

      {context ? (
        <p className="mt-1 text-xs text-muted">{context}</p>
      ) : null}
    </>
  );

  const classes =
    "block rounded-card border border-border bg-white p-4 transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(classes, "hover:bg-surface")}>
        {conteudo}
      </Link>
    );
  }

  return <div className={classes}>{conteudo}</div>;
}
