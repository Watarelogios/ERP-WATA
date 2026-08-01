import * as z from "zod";

import { optionalText, requiredText } from "@/lib/validations/common";

/** Normaliza o @ do Instagram: aceita com ou sem arroba, salva sem. */
const instagramField = z
  .string()
  .trim()
  .max(60, { error: "Use no maximo 60 caracteres." })
  .transform((value) => value.replace(/^@/, ""))
  .transform((value) => (value === "" ? null : value));

const phoneField = z
  .string()
  .trim()
  .max(20, { error: "Use no maximo 20 caracteres." })
  .refine((value) => value === "" || /^[\d\s()+-]+$/.test(value), {
    error: "Use apenas numeros, espacos, parenteses e tracos.",
  })
  .transform((value) => (value === "" ? null : value));

export const clientSchema = z.object({
  nome: requiredText("o nome do cliente", 120),
  cidade: optionalText(80),
  telefone: phoneField,
  instagram: instagramField,
  interesses: optionalText(500),
  observacoes: optionalText(1000),
});

export const supplierSchema = z.object({
  nome: requiredText("o nome do fornecedor", 120),
  cidade: optionalText(80),
  telefone: phoneField,
  instagram: instagramField,
  tipo_relacao: z.enum(["SELLER", "CONSIGNOR", "BOTH"], {
    error: "Escolha o tipo de relacao.",
  }),
  observacoes: optionalText(1000),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
