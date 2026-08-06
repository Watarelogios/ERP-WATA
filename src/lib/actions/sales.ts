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
  completeSaleSchema,
  payPayoutSchema,
  updateSaleSchema,
} from "@/lib/validations/sale";

function money(cents: number | null): number {
  return cents === null ? 0 : Number(centsToDatabase(cents));
}

/** Mensagens que a RPC ja escreve para o usuario final (Secao 18). */
function mensagemDaRpc(message: string): string | null {
  const conhecidas = [
    "nao pode ser vendido",
    "nao encontrado",
    "nao encontrada",
    "reservado para outro cliente",
    "menor que o sinal",
    "ja foi encerrado",
    "valor da venda",
    "cliente da venda",
  ];

  return conhecidas.some((trecho) => message.includes(trecho)) ? message : null;
}

export type CompleteSaleFormState = FormState<
  "client_id" | "valor_venda" | "origem" | "forma_pagamento" | "data_venda"
>;

/**
 * Conclui a venda a vista (Secao 13.4).
 *
 * A RPC cuida de tudo em uma transacao: venda, lucros, entrada de caixa apenas
 * do valor ainda nao recebido, mudanca de status, conclusao da reserva e
 * criacao do repasse quando o item e consignado.
 */
export async function completeSaleAction(
  _prevState: CompleteSaleFormState,
  formData: FormData,
): Promise<CompleteSaleFormState> {
  const parsed = completeSaleSchema.safeParse({
    watch_id: formData.get("watch_id"),
    client_id: formData.get("client_id"),
    valor_venda: formData.get("valor_venda") ?? "",
    origem: formData.get("origem") ?? "",
    forma_pagamento: formData.get("forma_pagamento") ?? "",
    data_venda: formData.get("data_venda") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  let saleWatchId: string;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("complete_sale", {
      p_watch_id: data.watch_id,
      p_client_id: data.client_id,
      p_valor_venda: money(data.valor_venda),
      p_origem: data.origem ?? undefined,
      p_forma_pagamento: data.forma_pagamento ?? undefined,
      p_data_venda: data.data_venda ?? undefined,
    });

    if (error) {
      console.error("[wata] completeSale", error.message);

      return {
        message:
          mensagemDaRpc(error.message) ??
          "Nao foi possivel concluir a venda. Nenhum valor foi lancado.",
      };
    }

    saleWatchId = data.watch_id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "completeSale",
      error,
      "Nao foi possivel concluir a venda. Nenhum valor foi lancado.",
    );
  }

  // A venda mexe em estoque, reservas, caixa, vendas e dashboard.
  revalidatePath("/", "layout");

  redirect(`/estoque/${saleWatchId}?vendido=1`);
}

export type PayPayoutFormState = FormState<
  "data_pagamento" | "forma_pagamento" | "comprovante_path"
>;

/**
 * Paga o consignante (Secao 13.5).
 *
 * A saida so acontece aqui: enquanto o repasse esta pendente, ele nao reduz o
 * caixa. A idempotency_key impede o debito acontecer duas vezes.
 */
export async function payPayoutAction(
  _prevState: PayPayoutFormState,
  formData: FormData,
): Promise<PayPayoutFormState> {
  const parsed = payPayoutSchema.safeParse({
    payout_id: formData.get("payout_id"),
    data_pagamento: formData.get("data_pagamento") ?? "",
    forma_pagamento: formData.get("forma_pagamento") ?? "",
    comprovante_path: formData.get("comprovante_path") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("pay_consignment_payout", {
      p_payout_id: data.payout_id,
      p_data_pagamento: data.data_pagamento ?? undefined,
      p_forma_pagamento: data.forma_pagamento ?? undefined,
      p_comprovante_path: data.comprovante_path ?? undefined,
    });

    if (error) {
      console.error("[wata] payPayout", error.message);

      return {
        message:
          mensagemDaRpc(error.message) ??
          "Nao foi possivel registrar o repasse. Nada foi lancado.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "payPayout",
      error,
      "Nao foi possivel registrar o repasse. Nada foi lancado.",
    );
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Repasse registrado e debitado do caixa." };
}

export type UpdateSaleFormState = FormState<
  "valor_venda" | "origem" | "forma_pagamento" | "data_venda" | "client_id"
>;

/**
 * Edita uma venda ja concluida.
 *
 * A RPC recalcula em cascata o que depende do valor: lucro bruto e liquido,
 * valor vendido do relogio, entrada no caixa (descontando o sinal ja recebido)
 * e o repasse pendente ao consignante. Em passos separados daqui, uma falha no
 * meio deixaria esses numeros contando historias diferentes.
 */
export async function updateSaleAction(
  _prevState: UpdateSaleFormState,
  formData: FormData,
): Promise<UpdateSaleFormState> {
  const parsed = updateSaleSchema.safeParse({
    sale_id: formData.get("sale_id"),
    valor_venda: formData.get("valor_venda") ?? "",
    origem: formData.get("origem") ?? "",
    forma_pagamento: formData.get("forma_pagamento") ?? "",
    data_venda: formData.get("data_venda") ?? "",
    client_id: formData.get("client_id") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("update_sale", {
      p_sale_id: data.sale_id,
      p_valor_venda: money(data.valor_venda),
      p_origem: data.origem ?? undefined,
      p_forma_pagamento: data.forma_pagamento ?? undefined,
      p_data_venda: data.data_venda ?? undefined,
      p_client_id: data.client_id ?? undefined,
    });

    if (error) {
      console.error("[wata] updateSale", error.message);

      /*
       * A RPC escreve mensagens acionaveis para o usuario (repasse ja pago,
       * cliente vindo de reserva, valor menor que o sinal).
       */
      const conhecida =
        mensagemDaRpc(error.message) ??
        (error.message.includes("nao pode ser trocado") ||
        error.message.includes("repasse deste item ja foi pago")
          ? error.message
          : null);

      return {
        message:
          conhecida ??
          "Nao foi possivel salvar a venda. Nenhum valor foi alterado.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "updateSale",
      error,
      "Nao foi possivel salvar a venda. Nenhum valor foi alterado.",
    );
  }

  // A edicao mexe em venda, caixa, estoque, repasse e dashboard.
  revalidatePath("/", "layout");

  redirect("/vendas?editada=1");
}
