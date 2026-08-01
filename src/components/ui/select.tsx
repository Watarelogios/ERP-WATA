import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type SelectProps = ComponentProps<"select">;

/** Select nativo: acessivel por padrao e com a roleta do sistema no celular. */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-border bg-white pl-3 pr-9 text-sm text-graphite-dark",
          "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
          "aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-graphite-dark",
        "placeholder:text-muted",
        "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
