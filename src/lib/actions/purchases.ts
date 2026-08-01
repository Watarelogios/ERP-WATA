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
  confirmPurchaseSchema,
  opportunitySchema,
} from "@/lib/validations/purchase";

function money(cents: number | null): number | null {
  return cents === null ? null : Number(centsToDatabase(cents));
}

export type OpportunityFormState = FormState<
  | "modelo"
  | "referencia"
  | "cidade"
  | "valor_pedido"
  | "minha_oferta"
  | "supplier_id"
  | "data_contato"
  | "notas"
>;

function collectOpportunity(formData: FormData) {
  return {
    modelo: formData.get("modelo"),
    referencia: formData.get("referencia") ?? "",
    cidade: formData.get("cidade") ?? "",
    valor_pedido: formData.get("valor_pedido") ?? "",
    minha_oferta: formData.get("minha_oferta") ?? "",
    supplier_id: formData.get("supplier_id") ?? "",
    data_contato: formData.get("data_contato") ?? "",
    notas: formData.get("notas") ?? "",
  };
}

export async function createOpportunityAction(
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  const parsed = opportunitySchema.safeParse(collectOpportunity(formData));

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const { supabase, user } = await requireContext();
    const data = parsed.data;

    const { error } = await supabase.from("purchase_opportunities").insert({
      owner_id: user.id,
      modelo: data.modelo,
      referencia: data.referencia,
      cidade: data.cidade,
      valor_pedido: money(data.valor_pedido),
      minha_oferta: money(data.minha_oferta),
      supplier_id: data.supplier_id,
      data_contato: data.data_contato ?? undefined,
      notas: data.notas,
    });

    if (error) {
      console.error("[wata] createOpportunity", error.message);
      return { message: "Nao foi possivel salvar a oportunidade." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("createOpportunity", error);
  }

  revalidatePath("/compras");
  redirect("/compras");
}

export async function updateOpportunityAction(
  opportunityId: string,
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  const parsed = opportunitySchema.safeParse(collectOpportunity(formData));

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const { supabase } = await requireContext();
    const data = parsed.data;

    /*
     * O filtro por status evita reescrever uma oportunidade ja encerrada: os
     * valores dela ficaram amarrados ao relogio e ao caixa.
     */
    const { error, count } = await supabase
      .from("purchase_opportunities")
      .update(
        {
          modelo: data.modelo,
          referencia: data.referencia,
          cidade: data.cidade,
          valor_pedido: money(data.valor_pedido),
          minha_oferta: money(data.minha_oferta),
          supplier_id: data.supplier_id,
          data_contato: data.data_contato ?? undefined,
          notas: data.notas,
        },
        { count: "exact" },
      )
      .eq("id", opportunityId)
      .eq("status", "NEGOTIATING");

    if (error) {
      console.error("[wata] updateOpportunity", error.message);
      return { message: "Nao foi possivel salvar a oportunidade." };
    }

    if (count === 0) {
      return {
        message:
          "Esta oportunidade ja foi encerrada e nao pode mais ser editada.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("updateOpportunity", error);
  }

  revalidatePath("/compras");
  redirect(`/compras/${opportunityId}`);
}

/** Marca a negociacao como perdida. Nao mexe em estoque nem em caixa. */
export async function markOpportunityLostAction(opportunityId: string) {
  try {
    const { supabase } = await requireContext();

    const { error } = await supabase
      .from("purchase_opportunities")
      .update({ status: "LOST", data_fechamento: new Date().toISOString().slice(0, 10) })
      .eq("id", opportunityId)
      .eq("status", "NEGOTIATING");

    if (error) {
      console.error("[wata] markOpportunityLost", error.message);
      return { message: "Nao foi possivel encerrar a negociacao." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("markOpportunityLost", error);
  }

  revalidatePath("/compras");

  return { success: true };
}

export type ConfirmPurchaseFormState = FormState<
  | "valor_fechado"
  | "data_compra"
  | "supplier_id"
  | "marca"
  | "modelo"
  | "referencia"
  | "ano"
  | "movimento"
  | "diametro_mm"
  | "mostrador"
  | "condicao"
  | "valor_minimo"
  | "valor_anunciado"
  | "observacoes"
> & { createdWataId?: string };

/**
 * Confirma a compra (Secao 13.1).
 *
 * Toda a operacao acontece na RPC `confirm_purchase`: relogio, despesa, saida
 * de caixa e encerramento da oportunidade em uma unica transacao. Fazer isso em
 * chamadas separadas daqui permitiria que uma falhasse no meio e deixasse, por
 * exemplo, o relogio sem a saida correspondente.
 */
export async function confirmPurchaseAction(
  _prevState: ConfirmPurchaseFormState,
  formData: FormData,
): Promise<ConfirmPurchaseFormState> {
  const parsed = confirmPurchaseSchema.safeParse({
    opportunity_id: formData.get("opportunity_id"),
    valor_fechado: formData.get("valor_fechado") ?? "",
    data_compra: formData.get("data_compra") ?? "",
    supplier_id: formData.get("supplier_id") ?? "",
    marca: formData.get("marca"),
    modelo: formData.get("modelo"),
    referencia: formData.get("referencia") ?? "",
    ano: formData.get("ano") ?? "",
    movimento: formData.get("movimento") || null,
    diametro_mm: formData.get("diametro_mm") ?? "",
    mostrador: formData.get("mostrador") ?? "",
    condicao: formData.get("condicao") ?? "",
    valor_minimo: formData.get("valor_minimo") ?? "",
    valor_anunciado: formData.get("valor_anunciado") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  let watchId: string;

  try {
    const { supabase } = await requireContext();

    const { data: result, error } = await supabase.rpc("confirm_purchase", {
      p_opportunity_id: data.opportunity_id,
      p_valor_fechado: money(data.valor_fechado) ?? 0,
      p_data_compra: data.data_compra ?? new Date().toISOString().slice(0, 10),
      p_supplier_id: data.supplier_id ?? undefined,
      p_marca: data.marca,
      p_modelo: data.modelo,
      p_referencia: data.referencia ?? undefined,
      p_ano: data.ano ?? undefined,
      p_movimento: data.movimento ?? undefined,
      p_diametro_mm: data.diametro_mm ?? undefined,
      p_mostrador: data.mostrador ?? undefined,
      p_condicao: data.condicao ?? undefined,
      p_valor_minimo: money(data.valor_minimo) ?? undefined,
      p_valor_anunciado: money(data.valor_anunciado) ?? undefined,
      p_observacoes: data.observacoes ?? undefined,
    });

    if (error) {
      console.error("[wata] confirmPurchase", error.message);

      /*
       * A RPC devolve mensagens ja escritas para o usuario (oportunidade
       * encerrada, nao encontrada). Erro tecnico vira mensagem generica.
       */
      const conhecida =
        error.message.includes("ja foi encerrada") ||
        error.message.includes("nao encontrada") ||
        error.message.includes("valor fechado");

      return {
        message: conhecida
          ? error.message
          : "Nao foi possivel confirmar a compra. Nenhum valor foi lancado.",
      };
    }

    const row = result?.[0];

    if (!row) {
      return {
        message: "Nao foi possivel confirmar a compra. Tente novamente.",
      };
    }

    watchId = row.watch_id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "confirmPurchase",
      error,
      "Nao foi possivel confirmar a compra. Nenhum valor foi lancado.",
    );
  }

  // A compra mexe em estoque, caixa e dashboard ao mesmo tempo.
  revalidatePath("/", "layout");

  redirect(`/estoque/${watchId}?comprado=1`);
}
