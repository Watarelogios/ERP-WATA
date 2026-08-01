import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type FilterChipProps = {
  href: string;
  active: boolean;
  children: ReactNode;
  /** Contagem exibida ao lado do rotulo, quando conhecida. */
  count?: number;
};

/**
 * Filtro por link, refletido na URL.
 *
 * O estado ativo e marcado por fundo grafite e `aria-current`, nao apenas por
 * cor: quem navega por leitor de tela precisa saber qual filtro esta aplicado.
 */
export function FilterChip({ href, active, children, count }: FilterChipProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        active
          ? "bg-graphite text-white"
          : "border border-border bg-white text-graphite hover:bg-surface",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-white/70" : "text-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
