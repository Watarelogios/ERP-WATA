import * as z from "zod";

import {
  dateField,
  moneyField,
  optionalText,
  requiredText,
} from "@/lib/validations/common";

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || z.uuid().safeParse(value).success, {
    error: "Selecao invalida.",
  });

/** Cadastro e edicao da oportunidade em negociacao. */
export const opportunitySchema = z.object({
  modelo: requiredText("o modelo", 120),
  referencia: optionalText(80),
  cidade: optionalText(80),
  valor_pedido: moneyField({ label: "valor pedido" }),
  minha_oferta: moneyField({ label: "valor da oferta" }),
  supplier_id: optionalUuid,
  data_contato: dateField,
  notas: optionalText(1000),
});

/**
 * Confirmacao da compra (Secao 13.1).
 *
 * Marca e modelo passam a ser obrigatorios: a oportunidade vira um item de
 * estoque, e estoque sem marca nao e pesquisavel.
 */
export const confirmPurchaseSchema = z.object({
  opportunity_id: z.uuid({ error: "Oportunidade invalida." }),
  valor_fechado: moneyField({ required: true, label: "valor fechado" }),
  data_compra: dateField,
  supplier_id: optionalUuid,

  marca: requiredText("a marca", 80),
  modelo: requiredText("o modelo", 120),
  referencia: optionalText(80),
  ano: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= 1800 && value <= 2200),
      { error: "Informe um ano valido." },
    ),
  movimento: z
    .enum(["MANUAL", "AUTOMATIC", "QUARTZ", "SOLAR", "OTHER"])
    .nullable()
    .catch(null),
  diametro_mm: z
    .string()
    .trim()
    .transform((value) =>
      value === "" ? null : Number(value.replace(",", ".")),
    )
    .refine((value) => value === null || (Number.isFinite(value) && value > 0), {
      error: "Informe um diametro valido.",
    }),
  mostrador: optionalText(80),
  condicao: optionalText(80),
  valor_minimo: moneyField({ label: "valor minimo" }),
  valor_anunciado: moneyField({ label: "valor anunciado" }),
  observacoes: optionalText(1000),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type ConfirmPurchaseInput = z.infer<typeof confirmPurchaseSchema>;
