"use client";

import { useState, type ComponentProps } from "react";

import { centsToDatabase, formatAmount, maskBRLInput, parseBRL } from "@/lib/money";
import { cn } from "@/lib/utils/cn";

export type MoneyInputProps = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "name"
> & {
  /** Nome do campo enviado ao servidor. */
  name: string;
  /** Valor inicial em centavos. */
  defaultValueCents?: number | null;
  onValueChange?: (cents: number | null) => void;
};

/**
 * Entrada monetaria em BRL.
 *
 * A digitacao e interpretada da direita para a esquerda, como centavos: teclar
 * "1", "2", "3" produz 1,23. E o comportamento que evita erro de casa decimal
 * em quem digita rapido.
 *
 * O campo visivel carrega a mascara; um input oculto leva o valor normalizado
 * ("3499.90") para a Server Action, que nao precisa saber nada de formatacao.
 *
 * inputMode="decimal" abre o teclado numerico no celular (Secao 16.1).
 */
export function MoneyInput({
  name,
  defaultValueCents,
  onValueChange,
  className,
  id,
  ...props
}: MoneyInputProps) {
  const [display, setDisplay] = useState(() =>
    defaultValueCents !== null && defaultValueCents !== undefined
      ? formatAmount(defaultValueCents)
      : "",
  );

  const cents = parseBRL(display);

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted"
        aria-hidden="true"
      >
        R$
      </span>

      <input
        {...props}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={(event) => {
          const masked = maskBRLInput(event.target.value);
          setDisplay(masked);
          onValueChange?.(parseBRL(masked));
        }}
        className={cn(
          "h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-right text-sm tabular-nums text-graphite-dark",
          "placeholder:text-muted",
          "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
          "aria-[invalid=true]:border-danger",
          className,
        )}
      />

      {/*
       * O que o servidor recebe: string decimal simples, ou vazio quando o
       * campo esta em branco (para diferenciar "zero" de "nao informado").
       */}
      <input
        type="hidden"
        name={name}
        value={cents === null ? "" : centsToDatabase(cents)}
      />
    </div>
  );
}
