import * as z from "zod";

import { dateField, moneyField, optionalText } from "@/lib/validations/common";

export const completeSaleSchema = z.object({
  watch_id: z.uuid({ error: "Relogio invalido." }),
  client_id: z.uuid({ error: "Selecione o cliente." }),
  valor_venda: moneyField({ required: true, label: "valor da venda" }),
  origem: optionalText(60),
  forma_pagamento: optionalText(60),
  data_venda: dateField,
});

export const payPayoutSchema = z.object({
  payout_id: z.uuid({ error: "Repasse invalido." }),
  data_pagamento: dateField,
  forma_pagamento: optionalText(60),
  comprovante_path: optionalText(500),
});

export type CompleteSaleInput = z.infer<typeof completeSaleSchema>;
export type PayPayoutInput = z.infer<typeof payPayoutSchema>;
