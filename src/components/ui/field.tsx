import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type FieldMessages = {
  description?: ReactNode;
  error?: string;
};

/**
 * Props ARIA que o controle do campo precisa receber.
 *
 * Mantidas explicitas (em vez de cloneElement) para que a ligacao semantica
 * entre input, descricao e erro seja visivel no ponto de uso.
 */
export function fieldAria(id: string, { description, error }: FieldMessages) {
  const describedBy = [
    description ? `${id}-description` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

export type FieldProps = FieldMessages & {
  id: string;
  label: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children}

      {description ? (
        <p id={`${id}-description`} className="text-xs text-muted">
          {description}
        </p>
      ) : null}

      {/* role="alert" garante que o leitor de tela anuncie o erro. */}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
