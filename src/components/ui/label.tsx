import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export type LabelProps = ComponentProps<"label">;

/** Rotulos sao permanentes: placeholder nunca substitui label. */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-graphite-dark",
        "has-[+_:disabled]:text-muted",
        className,
      )}
      {...props}
    />
  );
}
