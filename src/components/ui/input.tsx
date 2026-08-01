import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-graphite-dark",
        "placeholder:text-muted",
        "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
        // O estado de erro e comunicado por borda + texto, nunca so por cor.
        "aria-[invalid=true]:border-danger",
        className,
      )}
      {...props}
    />
  );
}
