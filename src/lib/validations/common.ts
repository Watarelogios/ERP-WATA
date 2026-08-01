import * as z from "zod";

import { isValidMoney, parseBRL } from "@/lib/money";

/**
 * Campo monetario vindo de um formulario.
 *
 * O MoneyInput envia string decimal ("3499.90") ou vazio. A validacao converte
 * para centavos inteiros e recusa negativo, NaN e precisao indevida (Secao 18).
 */
export function moneyField(options?: { required?: boolean; label?: string }) {
  const label = options?.label ?? "valor";

  return z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : parseBRL(value)))
    .refine((cents) => cents === null || isValidMoney(cents), {
      error: `Informe um ${label} valido.`,
    })
    .refine((cents) => !options?.required || cents !== null, {
      error: `Informe o ${label}.`,
    });
}

/** Texto opcional: string vazia vira null para nao poluir o banco. */
export function optionalText(max = 500) {
  return z
    .string()
    .trim()
    .max(max, { error: `Use no maximo ${max} caracteres.` })
    .transform((value) => (value === "" ? null : value));
}

/** Texto obrigatorio com limite de tamanho. */
export function requiredText(label: string, max = 200) {
  return z
    .string()
    .trim()
    .min(1, { error: `Informe ${label}.` })
    .max(max, { error: `Use no maximo ${max} caracteres.` });
}

/** Percentual entre 0 e 100, conforme numeric(5,2) do banco. */
export const percentField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value.replace(",", "."))))
  .refine(
    (value) =>
      value === null ||
      (Number.isFinite(value) && value >= 0 && value <= 100),
    { error: "Informe um percentual entre 0 e 100." },
  );

/** Data no formato do input date. */
export const dateField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: "Informe uma data valida.",
  })
  .transform((value) => (value === "" ? null : value));
