import * as z from "zod";

import { moneyField, optionalText, requiredText } from "@/lib/validations/common";

/** Cada canal/categoria e um item curto; a lista chega como campos repetidos. */
const listField = z
  .array(z.string().trim().max(60))
  .transform((items) => {
    const limpos = items
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    // Remove duplicatas preservando a ordem escolhida pelo usuario.
    return Array.from(new Set(limpos));
  });

export const settingsSchema = z.object({
  nome_loja: requiredText("o nome da loja", 80),
  saldo_inicial: moneyField({ required: true, label: "saldo inicial" }),
  dias_estoque_parado: z
    .string()
    .trim()
    .transform((value) => (value === "" ? 90 : Number(value)))
    .refine(
      (value) => Number.isInteger(value) && value > 0 && value <= 3650,
      { error: "Informe um numero de dias entre 1 e 3650." },
    ),
  canais_venda: listField,
  categorias: listField,
  logo_url: optionalText(500),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
