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
  consignedWatchSchema,
  ownedWatchSchema,
} from "@/lib/validations/watch";

export type WatchFormState = FormState<
  | "marca"
  | "modelo"
  | "referencia"
  | "ano"
  | "movimento"
  | "diametro_mm"
  | "mostrador"
  | "condicao"
  | "valor_compra"
  | "valor_minimo"
  | "valor_anunciado"
  | "supplier_id"
  | "data_entrada"
  | "observacoes"
  | "consignacao_supplier_id"
  | "consignacao_modalidade"
  | "consignacao_valor_fixo"
  | "consignacao_percentual"
  | "consignacao_prazo"
> & {
  /** Pede a confirmacao de minimo acima do anunciado sem perder o formulario. */
  needsConfirmation?: boolean;
  /** ID criado, para o formulario seguir para o upload de fotos. */
  createdWatchId?: string;
};

function money(cents: number | null): number | null {
  return cents === null ? null : Number(centsToDatabase(cents));
}

type WatchFieldErrors = NonNullable<WatchFormState["errors"]>;

/**
 * Agrupa os erros por campo a partir dos issues.
 *
 * `z.flattenError` infere um unico tipo de schema, e aqui o resultado do parse
 * e a uniao de dois schemas (proprio e consignado) — a inferencia falha. Ler os
 * issues resolve sem cast e produz exatamente o mesmo `fieldErrors`.
 */
function fieldErrorsFrom(issues: readonly z.core.$ZodIssue[]): WatchFieldErrors {
  const errors: WatchFieldErrors = {};

  for (const issue of issues) {
    const [first] = issue.path;

    // Erro de formulario (sem path) nao pertence a nenhum campo.
    if (typeof first !== "string") {
      continue;
    }

    const key = first as keyof WatchFieldErrors;
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

function collectBase(formData: FormData) {
  return {
    marca: formData.get("marca"),
    modelo: formData.get("modelo"),
    referencia: formData.get("referencia") ?? "",
    ano: formData.get("ano") ?? "",
    movimento: formData.get("movimento") ?? "",
    diametro_mm: formData.get("diametro_mm") ?? "",
    mostrador: formData.get("mostrador") ?? "",
    condicao: formData.get("condicao") ?? "",
    valor_minimo: formData.get("valor_minimo") ?? "",
    valor_anunciado: formData.get("valor_anunciado") ?? "",
    supplier_id: formData.get("supplier_id") ?? "",
    data_entrada: formData.get("data_entrada") ?? "",
    observacoes: formData.get("observacoes") ?? "",
    confirmar_minimo_acima: formData.get("confirmar_minimo_acima") ?? "",
  };
}

/**
 * Cria o relogio (proprio ou consignado).
 *
 * O WATA-ID vem do DEFAULT da coluna, gerado pela sequencia do banco — a
 * aplicacao nunca calcula o proximo codigo (Secao 11).
 *
 * Consignado cria tambem a consignacao. Se a consignacao falhar, o relogio
 * criado e desfeito para nao deixar registro parcial (Secao 13).
 */
export async function createWatchAction(
  _prevState: WatchFormState,
  formData: FormData,
): Promise<WatchFormState> {
  const tipo = formData.get("tipo");

  const parsed =
    tipo === "CONSIGNED"
      ? consignedWatchSchema.safeParse({
          ...collectBase(formData),
          tipo,
          consignacao_supplier_id: formData.get("consignacao_supplier_id"),
          consignacao_modalidade: formData.get("consignacao_modalidade"),
          consignacao_valor_fixo: formData.get("consignacao_valor_fixo") ?? "",
          consignacao_percentual: formData.get("consignacao_percentual") ?? "",
          consignacao_prazo: formData.get("consignacao_prazo") ?? "",
        })
      : ownedWatchSchema.safeParse({
          ...collectBase(formData),
          tipo: "OWNED",
          valor_compra: formData.get("valor_compra") ?? "",
        });

  if (!parsed.success) {
    const errors = fieldErrorsFrom(parsed.error.issues);

    return {
      errors,
      needsConfirmation: Boolean(
        errors.valor_minimo?.some((message) => message.includes("Confirme")),
      ),
    };
  }

  const data = parsed.data;
  let createdWatchId: string;

  try {
    const { supabase, user } = await requireContext();

    const { data: watch, error } = await supabase
      .from("watches")
      .insert({
        owner_id: user.id,
        marca: data.marca,
        modelo: data.modelo,
        referencia: data.referencia,
        ano: data.ano,
        movimento: data.movimento,
        diametro_mm: data.diametro_mm,
        mostrador: data.mostrador,
        condicao: data.condicao,
        tipo: data.tipo,
        valor_compra: data.tipo === "OWNED" ? money(data.valor_compra) : null,
        valor_minimo: money(data.valor_minimo),
        valor_anunciado: money(data.valor_anunciado),
        supplier_id:
          data.tipo === "CONSIGNED"
            ? data.consignacao_supplier_id
            : data.supplier_id,
        data_entrada: data.data_entrada ?? undefined,
        observacoes: data.observacoes,
      })
      .select("id")
      .single();

    if (error || !watch) {
      throw error ?? new Error("insert sem retorno");
    }

    createdWatchId = watch.id;

    if (data.tipo === "CONSIGNED") {
      const { error: consignmentError } = await supabase
        .from("consignments")
        .insert({
          owner_id: user.id,
          watch_id: watch.id,
          supplier_id: data.consignacao_supplier_id,
          modalidade: data.consignacao_modalidade,
          valor_repasse_fixo:
            data.consignacao_modalidade === "FIXED_PAYOUT"
              ? money(data.consignacao_valor_fixo)
              : null,
          percentual_wata:
            data.consignacao_modalidade === "WATA_PERCENTAGE"
              ? data.consignacao_percentual
              : null,
          prazo: data.consignacao_prazo,
        });

      if (consignmentError) {
        /*
         * Compensacao: sem a consignacao o relogio consignado ficaria sem
         * regra de repasse. Melhor desfazer do que persistir pela metade.
         * A transacao real (RPC) chega com as operacoes da Secao 13.
         */
        await supabase.from("watches").delete().eq("id", watch.id);

        throw consignmentError;
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "createWatch",
      error,
      "Nao foi possivel cadastrar o relogio. Tente novamente.",
    );
  }

  revalidatePath("/estoque");

  /*
   * O redirecionamento leva ao detalhe, onde o upload de fotos acontece.
   * Fotos fora da criacao: uma falha de upload nao pode invalidar o cadastro
   * (Secao 18).
   */
  redirect(`/estoque/${createdWatchId}?nova=1`);
}

export type WatchEditFormState = FormState<
  | "marca"
  | "modelo"
  | "referencia"
  | "ano"
  | "movimento"
  | "diametro_mm"
  | "mostrador"
  | "condicao"
  | "valor_compra"
  | "valor_minimo"
  | "valor_anunciado"
  | "supplier_id"
  | "data_entrada"
  | "observacoes"
> & { needsConfirmation?: boolean };

/** Atualiza os dados cadastrais. Status, venda e reserva tem fluxos proprios. */
export async function updateWatchAction(
  watchId: string,
  _prevState: WatchEditFormState,
  formData: FormData,
): Promise<WatchEditFormState> {
  const tipo = formData.get("tipo") === "CONSIGNED" ? "CONSIGNED" : "OWNED";

  const parsed =
    tipo === "OWNED"
      ? ownedWatchSchema.safeParse({
          ...collectBase(formData),
          tipo,
          valor_compra: formData.get("valor_compra") ?? "",
        })
      : consignedWatchSchema
          .safeParse({
            ...collectBase(formData),
            tipo,
            consignacao_supplier_id: formData.get("consignacao_supplier_id"),
            consignacao_modalidade: formData.get("consignacao_modalidade"),
            consignacao_valor_fixo:
              formData.get("consignacao_valor_fixo") ?? "",
            consignacao_percentual:
              formData.get("consignacao_percentual") ?? "",
            consignacao_prazo: formData.get("consignacao_prazo") ?? "",
          });

  if (!parsed.success) {
    const errors = fieldErrorsFrom(parsed.error.issues);

    return {
      errors,
      needsConfirmation: Boolean(
        errors.valor_minimo?.some((message) => message.includes("Confirme")),
      ),
    };
  }

  const data = parsed.data;

  try {
    const { supabase } = await requireContext();

    const { data: updated, error } = await supabase
      .from("watches")
      .update({
        marca: data.marca,
        modelo: data.modelo,
        referencia: data.referencia,
        ano: data.ano,
        movimento: data.movimento,
        diametro_mm: data.diametro_mm,
        mostrador: data.mostrador,
        condicao: data.condicao,
        valor_compra: data.tipo === "OWNED" ? money(data.valor_compra) : null,
        valor_minimo: money(data.valor_minimo),
        valor_anunciado: money(data.valor_anunciado),
        supplier_id:
          data.tipo === "CONSIGNED"
            ? data.consignacao_supplier_id
            : data.supplier_id,
        data_entrada: data.data_entrada ?? undefined,
        observacoes: data.observacoes,
      })
      .eq("id", watchId)
      .select("id");

    if (error) {
      throw error;
    }

    if (!updated?.length) {
      return { message: "Relogio nao encontrado. Atualize a pagina." };
    }

    if (data.tipo === "CONSIGNED") {
      // Atualiza a consignacao vigente (encerrado_em null).
      const { error: consignmentError } = await supabase
        .from("consignments")
        .update({
          supplier_id: data.consignacao_supplier_id,
          modalidade: data.consignacao_modalidade,
          valor_repasse_fixo:
            data.consignacao_modalidade === "FIXED_PAYOUT"
              ? money(data.consignacao_valor_fixo)
              : null,
          percentual_wata:
            data.consignacao_modalidade === "WATA_PERCENTAGE"
              ? data.consignacao_percentual
              : null,
          prazo: data.consignacao_prazo,
        })
        .eq("watch_id", watchId)
        .is("encerrado_em", null);

      if (consignmentError) {
        throw consignmentError;
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "updateWatch",
      error,
      "Nao foi possivel salvar as alteracoes. Tente novamente.",
    );
  }

  revalidatePath("/estoque");
  revalidatePath(`/estoque/${watchId}`);

  return { success: true, message: "Alteracoes salvas." };
}

/** Exclusao logica (Secao 8): o historico permanece integro. */
export async function archiveWatchAction(watchId: string): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    // Item vendido nao pode ser arquivado por engano: preserva o historico.
    const { data, error } = await supabase
      .from("watches")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", watchId)
      .neq("status", "SOLD")
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return {
        message:
          "Nao foi possivel arquivar: o relogio nao existe ou ja foi vendido.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("archiveWatch", error);
  }

  revalidatePath("/estoque");
  redirect("/estoque");
}
