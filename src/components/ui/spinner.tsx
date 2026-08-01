import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type SpinnerProps = {
  className?: string;
  /** Texto anunciado enquanto a operacao acontece. */
  label?: string;
};

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <>
      <LoaderCircle
        className={cn("size-4 animate-spin", className)}
        aria-hidden="true"
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}
