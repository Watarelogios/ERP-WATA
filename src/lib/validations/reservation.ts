import * as z from "zod";

import { dateField, moneyField, optionalText } from "@/lib/validations/common";

export const createReservationSchema = z
  .object({
    watch_id: z.uuid({ error: "Relogio invalido." }),
    client_id: z.uuid({ error: "Selecione o cliente." }),
    valor_combinado: moneyField({
      required: true,
      label: "valor combinado",
    }),
    validade: dateField.refine((value) => value !== null, {
      error: "Informe ate quando a reserva vale.",
    }),
    valor_sinal: moneyField({ label: "valor do sinal" }),
    data_sinal: dateField,
    forma_pagamento: optionalText(60),
  })
  .refine(
    (data) => (data.valor_sinal ?? 0) <= (data.valor_combinado ?? 0),
    {
      error: "O sinal nao pode ser maior que o valor combinado.",
      path: ["valor_sinal"],
    },
  );

export const cancelReservationSchema = z
  .object({
    reservation_id: z.uuid({ error: "Reserva invalida." }),
    status: z.enum(["CANCELLED", "EXPIRED"]),
    destino_sinal: z
      .enum(["REFUNDED", "RETAINED", "CUSTOMER_CREDIT"])
      .nullable()
      .catch(null),
    motivo: optionalText(300),
    /** Enviado pela tela para exigir a escolha apenas quando houve sinal. */
    tem_sinal: z.enum(["0", "1"]),
  })
  .refine((data) => data.tem_sinal === "0" || data.destino_sinal !== null, {
    error: "Escolha o que acontece com o sinal recebido.",
    path: ["destino_sinal"],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
