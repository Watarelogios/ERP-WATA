"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { requireContext, UnauthorizedError } from "@/lib/actions/guard";
import { centsToDatabase } from "@/lib/money";
import {
  cancelReservationSchema,
  createReservationSchema,
} from "@/lib/validations/reservation";

function money(cents: number | null): number {
  return cents === null ? 0 : Number(centsToDatabase(cents));
}

/**
 * Mensagens que a RPC ja escreve para o usuario final.
 *
 * Erro tecnico do Postgres nunca chega a tela (Secao 18); estas sao as unicas
 * mensagens repassadas literalmente.
 */
function mensagemDaRpc(message: string): string | null {
  const conhecidas = [
    "nao pode ser reservado",
    "nao encontrado",
    "nao encontrada",
    "ja foi encerrada",
    "sinal nao pode ser maior",
    "destino do sinal",
    "valor combinado",
    "validade da reserva",
  ];

  return conhecidas.some((trecho) => message.includes(trecho)) ? message : null;
}

export type CreateReservationFormState = FormState<
  | "client_id"
  | "valor_combinado"
  | "validade"
  | "valor_sinal"
  | "data_sinal"
  | "forma_pagamento"
>;

/**
 * Cria a reserva (Secao 13.2).
 *
 * A operacao inteira acontece na RPC: reserva, mudanca de status, historico e
 * lancamento do sinal. Em passos separados, uma falha deixaria o relogio
 * reservado sem o sinal registrado — ou o contrario.
 */
export async function createReservationAction(
  _prevState: CreateReservationFormState,
  formData: FormData,
): Promise<CreateReservationFormState> {
  const parsed = createReservationSchema.safeParse({
    watch_id: formData.get("watch_id"),
    client_id: formData.get("client_id"),
    valor_combinado: formData.get("valor_combinado") ?? "",
    validade: formData.get("validade") ?? "",
    valor_sinal: formData.get("valor_sinal") ?? "",
    data_sinal: formData.get("data_sinal") ?? "",
    forma_pagamento: formData.get("forma_pagamento") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  let watchId: string;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("create_reservation", {
      p_watch_id: data.watch_id,
      p_client_id: data.client_id,
      p_valor_combinado: money(data.valor_combinado),
      p_validade: data.validade!,
      p_valor_sinal: money(data.valor_sinal),
      p_data_sinal: data.data_sinal ?? undefined,
      p_forma_pagamento: data.forma_pagamento ?? undefined,
    });

    if (error) {
      console.error("[wata] createReservation", error.message);

      return {
        message:
          mensagemDaRpc(error.message) ??
          "Nao foi possivel criar a reserva. Nada foi alterado.",
      };
    }

    watchId = data.watch_id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "createReservation",
      error,
      "Nao foi possivel criar a reserva. Nada foi alterado.",
    );
  }

  // Reserva mexe em estoque, reservas, caixa e dashboard ao mesmo tempo.
  revalidatePath("/", "layout");

  redirect(`/estoque/${watchId}?reservado=1`);
}

export type CancelReservationFormState = FormState<
  "destino_sinal" | "motivo" | "status"
>;

/**
 * Encerra a reserva por cancelamento ou vencimento (Secao 13.3).
 *
 * O destino do sinal muda o efeito no caixa: devolvido gera saida, retido
 * apenas reclassifica a entrada existente, e credito nao toca no caixa.
 */
export async function cancelReservationAction(
  _prevState: CancelReservationFormState,
  formData: FormData,
): Promise<CancelReservationFormState> {
  const parsed = cancelReservationSchema.safeParse({
    reservation_id: formData.get("reservation_id"),
    status: formData.get("status") ?? "CANCELLED",
    destino_sinal: formData.get("destino_sinal") || null,
    motivo: formData.get("motivo") ?? "",
    tem_sinal: formData.get("tem_sinal") ?? "0",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("cancel_reservation", {
      p_reservation_id: data.reservation_id,
      p_status: data.status,
      p_destino_sinal: data.destino_sinal ?? undefined,
      p_motivo: data.motivo ?? undefined,
    });

    if (error) {
      console.error("[wata] cancelReservation", error.message);

      return {
        message:
          mensagemDaRpc(error.message) ??
          "Nao foi possivel encerrar a reserva. Nada foi alterado.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "cancelReservation",
      error,
      "Nao foi possivel encerrar a reserva. Nada foi alterado.",
    );
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Reserva encerrada." };
}
