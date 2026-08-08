"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { requireContext, UnauthorizedError } from "@/lib/actions/guard";
import { centsToDatabase } from "@/lib/money";
import {
  dateField,
  moneyField,
  optionalText,
} from "@/lib/validations/common";

const INCOME_CATEGORIES = ["OTHER_INCOME"] as const;
const EXPENSE_CATEGORIES = [
  "PURCHASE",
  "SHIPPING",
  "SERVICE",
  "STRAP",
  "PACKAGING",
  "META_ADS",
  "OTHER_EXPENSE",
] as const;

/**
 * Lancamento avulso.
 *
 * SALE, RESERVATION_DEPOSIT, RETAINED_DEPOSIT e PAYOUT ficam de fora: nascem
 * das RPCs com vinculo e chave de idempotencia, e cria-las a mao permitiria
 * caixa, estoque e repasse divergirem.
 *
 * PURCHASE e permitida porque cadastrar um relogio direto no estoque nao lanca
 * saida nenhuma — comportamento correto para o estoque que ja existia antes do
 * sistema, mas que deixaria sem registro a compra feita hoje. A categoria e
 * ignorada no calculo de lucro do item (ver watch_linked_expenses), entao ela
 * afeta o caixa sem contaminar a margem.
 */
const manualTransactionSchema = z
  .object({
    direcao: z.enum(["INCOME", "EXPENSE"]),
    categoria: z.enum([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
    valor: moneyField({ required: true, label: "valor" }),
    data: dateField,
    descricao: optionalText(300),
  })
  .refine(
    (data) =>
      data.direcao === "INCOME"
        ? INCOME_CATEGORIES.includes(
            data.categoria as (typeof INCOME_CATEGORIES)[number],
          )
        : EXPENSE_CATEGORIES.includes(
            data.categoria as (typeof EXPENSE_CATEGORIES)[number],
          ),
    { error: "Categoria incompativel com o tipo do lancamento.", path: ["categoria"] },
  );

export type ManualTransactionFormState = FormState<
  "direcao" | "categoria" | "valor" | "data" | "descricao"
>;

export async function createManualTransactionAction(
  _prevState: ManualTransactionFormState,
  formData: FormData,
): Promise<ManualTransactionFormState> {
  const parsed = manualTransactionSchema.safeParse({
    direcao: formData.get("direcao"),
    categoria: formData.get("categoria"),
    valor: formData.get("valor") ?? "",
    data: formData.get("data") ?? "",
    descricao: formData.get("descricao") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const { supabase, user } = await requireContext();

    const { error } = await supabase.from("financial_transactions").insert({
      owner_id: user.id,
      direcao: data.direcao,
      categoria: data.categoria,
      valor: Number(centsToDatabase(data.valor ?? 0)),
      status: "CONFIRMED",
      data: data.data ?? undefined,
      descricao: data.descricao,
    });

    if (error) {
      console.error("[wata] createManualTransaction", error.message);
      return { message: "Nao foi possivel registrar o lancamento." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("createManualTransaction", error);
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Lancamento registrado." };
}

export type ReverseTransactionFormState = FormState<"motivo">;

/** Estorna o lancamento sem apagar o historico (Secao 18). */
export async function reverseTransactionAction(
  _prevState: ReverseTransactionFormState,
  formData: FormData,
): Promise<ReverseTransactionFormState> {
  const transactionId = String(formData.get("transaction_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!z.uuid().safeParse(transactionId).success) {
    return { message: "Lancamento invalido." };
  }

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("reverse_financial_transaction", {
      p_transaction_id: transactionId,
      p_motivo: motivo || undefined,
    });

    if (error) {
      console.error("[wata] reverseTransaction", error.message);

      // A RPC ja escreve estas mensagens para o usuario final.
      const conhecida =
        error.message.includes("pertence a uma operacao") ||
        error.message.includes("Somente lancamento confirmado") ||
        error.message.includes("nao encontrado");

      return {
        message: conhecida
          ? error.message
          : "Nao foi possivel estornar o lancamento.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("reverseTransaction", error);
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Lancamento estornado." };
}

const installmentSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, { error: "Descreva a compra. Ex.: Tag Heuer ref X." })
    .max(200, { error: "Use no maximo 200 caracteres." }),
  valor_total: moneyField({ required: true, label: "valor total" }),
  parcelas: z
    .string()
    .trim()
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isInteger(value) && value >= 2 && value <= 60,
      { error: "Informe de 2 a 60 parcelas." },
    ),
  primeiro_vencimento: dateField,
  categoria: z.enum([...EXPENSE_CATEGORIES]),
});

export type InstallmentFormState = FormState<
  "descricao" | "valor_total" | "parcelas" | "primeiro_vencimento" | "categoria"
>;

/**
 * Cria uma compra parcelada.
 *
 * As parcelas nascem pendentes: o total devido aparece hoje no extrato, mas o
 * caixa so e debitado conforme cada uma e paga.
 */
export async function createInstallmentPurchaseAction(
  _prevState: InstallmentFormState,
  formData: FormData,
): Promise<InstallmentFormState> {
  const parsed = installmentSchema.safeParse({
    descricao: formData.get("descricao"),
    valor_total: formData.get("valor_total") ?? "",
    parcelas: formData.get("parcelas") ?? "",
    primeiro_vencimento: formData.get("primeiro_vencimento") ?? "",
    categoria: formData.get("categoria") ?? "PURCHASE",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("create_installment_purchase", {
      p_descricao: data.descricao,
      p_valor_total: Number(centsToDatabase(data.valor_total ?? 0)),
      p_parcelas: data.parcelas,
      p_primeiro_vencimento: data.primeiro_vencimento ?? undefined,
      p_categoria: data.categoria,
    });

    if (error) {
      console.error("[wata] createInstallmentPurchase", error.message);

      const conhecida =
        error.message.includes("entre 2 e 60") ||
        error.message.includes("valor total") ||
        error.message.includes("descricao");

      return {
        message: conhecida
          ? error.message
          : "Nao foi possivel registrar a compra parcelada.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("createInstallmentPurchase", error);
  }

  revalidatePath("/", "layout");

  return {
    success: true,
    message: `Compra parcelada em ${data.parcelas}x registrada.`,
  };
}

export type PayInstallmentFormState = FormState<"data_pagamento">;

/** Confirma o pagamento de uma parcela, debitando o caixa uma unica vez. */
export async function payInstallmentAction(
  _prevState: PayInstallmentFormState,
  formData: FormData,
): Promise<PayInstallmentFormState> {
  const transactionId = String(formData.get("transaction_id") ?? "");

  if (!z.uuid().safeParse(transactionId).success) {
    return { message: "Parcela invalida." };
  }

  const dataPagamento = String(formData.get("data_pagamento") ?? "").trim();

  try {
    const { supabase } = await requireContext();

    const { error } = await supabase.rpc("pay_installment", {
      p_transaction_id: transactionId,
      p_data_pagamento: dataPagamento || undefined,
    });

    if (error) {
      console.error("[wata] payInstallment", error.message);

      const conhecida =
        error.message.includes("ja esta como") ||
        error.message.includes("nao encontrada") ||
        error.message.includes("nao e uma parcela");

      return {
        message: conhecida
          ? error.message
          : "Nao foi possivel registrar o pagamento da parcela.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("payInstallment", error);
  }

  revalidatePath("/", "layout");

  return { success: true, message: "Parcela paga e debitada do caixa." };
}
