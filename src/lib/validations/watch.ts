import * as z from "zod";

import {
  dateField,
  moneyField,
  optionalText,
  percentField,
  requiredText,
} from "@/lib/validations/common";

const uuidField = z.uuid({ error: "Selecao invalida." });

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || z.uuid().safeParse(value).success, {
    error: "Selecao invalida.",
  });

const baseWatchSchema = z.object({
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
      { error: "Informe um ano entre 1800 e 2200." },
    ),

  movimento: z
    .enum(["MANUAL", "AUTOMATIC", "QUARTZ", "SOLAR", "OTHER"])
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),

  diametro_mm: z
    .string()
    .trim()
    .transform((value) =>
      value === "" ? null : Number(value.replace(",", ".")),
    )
    .refine(
      (value) =>
        value === null ||
        (Number.isFinite(value) && value > 0 && value < 100),
      { error: "Informe um diametro em milimetros (ex.: 40 ou 40,5)." },
    ),

  mostrador: optionalText(80),
  condicao: optionalText(80),

  valor_minimo: moneyField({ label: "valor minimo" }),
  valor_anunciado: moneyField({ label: "valor anunciado" }),

  supplier_id: optionalUuid,
  data_entrada: dateField,
  observacoes: optionalText(1000),

  /**
   * Minimo acima do anunciado exige confirmacao explicita (Secao 10.3).
   * O formulario reenvia com este campo marcado apos o usuario confirmar.
   */
  confirmar_minimo_acima: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

/** Regra compartilhada: minimo > anunciado pede confirmacao, nao erro fatal. */
function refineMinimoAnunciado<
  T extends {
    valor_minimo: number | null;
    valor_anunciado: number | null;
    confirmar_minimo_acima: boolean;
  },
>(schema: z.ZodType<T>) {
  return schema.refine(
    (data) =>
      data.valor_minimo === null ||
      data.valor_anunciado === null ||
      data.valor_minimo <= data.valor_anunciado ||
      data.confirmar_minimo_acima,
    {
      error:
        "O valor minimo esta acima do anunciado. Confirme que e intencional.",
      path: ["valor_minimo"],
    },
  );
}

/** Item proprio: valor de compra obrigatorio. */
export const ownedWatchSchema = refineMinimoAnunciado(
  baseWatchSchema.extend({
    tipo: z.literal("OWNED"),
    valor_compra: moneyField({ required: true, label: "valor de compra" }),
    /*
     * Marca a compra feita agora, que precisa sair do caixa. Estoque que ja
     * existia antes do sistema fica desmarcado: o dinheiro saiu antes.
     */
    lancar_no_caixa: z
      .string()
      .optional()
      .transform((value) => value === "on" || value === "true"),
  }),
);

/** Item consignado: sem valor de compra; consignacao obrigatoria. */
export const consignedWatchSchema = refineMinimoAnunciado(
  baseWatchSchema.extend({
    tipo: z.literal("CONSIGNED"),
    consignacao_supplier_id: uuidField,
    consignacao_modalidade: z.enum(["FIXED_PAYOUT", "WATA_PERCENTAGE"], {
      error: "Escolha a modalidade da consignacao.",
    }),
    consignacao_valor_fixo: moneyField({ label: "valor do repasse" }),
    consignacao_percentual: percentField,
    consignacao_prazo: dateField,
  }),
).superRefine((data, ctx) => {
  if (
    data.consignacao_modalidade === "FIXED_PAYOUT" &&
    data.consignacao_valor_fixo === null
  ) {
    ctx.addIssue({
      code: "custom",
      error: "Informe o valor do repasse fixo.",
      path: ["consignacao_valor_fixo"],
    });
  }

  if (
    data.consignacao_modalidade === "WATA_PERCENTAGE" &&
    data.consignacao_percentual === null
  ) {
    ctx.addIssue({
      code: "custom",
      error: "Informe o percentual da WATA.",
      path: ["consignacao_percentual"],
    });
  }
});

export type OwnedWatchInput = z.infer<typeof ownedWatchSchema>;
export type ConsignedWatchInput = z.infer<typeof consignedWatchSchema>;
