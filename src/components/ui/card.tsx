import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

/** Card WATA: raio moderado, borda discreta, sem sombra. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-b border-border px-4 py-3 sm:px-5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-base font-semibold", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}
