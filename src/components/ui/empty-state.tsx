import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  /** Explicacao objetiva do que falta e por que a lista esta vazia. */
  description: string;
  /** Acao que permite comecar; estado vazio sem saida e um beco. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon className="mb-3 size-8 text-muted" aria-hidden="true" />
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
