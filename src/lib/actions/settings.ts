"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { requireContext, UnauthorizedError } from "@/lib/actions/guard";
import { centsToDatabase } from "@/lib/money";
import { settingsSchema } from "@/lib/validations/settings";

export type SettingsFormState = FormState<
  | "nome_loja"
  | "saldo_inicial"
  | "dias_estoque_parado"
  | "canais_venda"
  | "categorias"
  | "logo_url"
>;

export async function saveSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = settingsSchema.safeParse({
    nome_loja: formData.get("nome_loja"),
    saldo_inicial: formData.get("saldo_inicial"),
    dias_estoque_parado: formData.get("dias_estoque_parado"),
    // Listas chegam como campos repetidos com o mesmo nome.
    canais_venda: formData.getAll("canais_venda").map(String),
    categorias: formData.getAll("categorias").map(String),
    logo_url: formData.get("logo_url") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const { supabase, user } = await requireContext();

    /*
     * upsert por owner_id: a tabela tem unique (owner_id), entao o primeiro
     * salvamento cria e os seguintes atualizam, sem checagem previa que
     * poderia correr com outra aba.
     */
    const { error } = await supabase.from("settings").upsert(
      {
        owner_id: user.id,
        nome_loja: parsed.data.nome_loja,
        /*
         * Number() sobre a string decimal e seguro aqui: valores com ate 2
         * casas dentro de numeric(14,2) fazem ida e volta exata pelo double
         * (representacao mais curta). A conta continua acontecendo em centavos.
         */
        saldo_inicial: Number(centsToDatabase(parsed.data.saldo_inicial ?? 0)),
        dias_estoque_parado: parsed.data.dias_estoque_parado,
        canais_venda: parsed.data.canais_venda,
        categorias: parsed.data.categorias,
        logo_url: parsed.data.logo_url,
      },
      { onConflict: "owner_id" },
    );

    if (error) {
      console.error("[wata] saveSettings", error.message);

      return {
        message: "Nao foi possivel salvar as configuracoes. Tente novamente.",
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("saveSettings", error);
  }

  /*
   * O saldo inicial entra no calculo do caixa, e o nome da loja aparece em
   * varias telas: revalidar o layout inteiro evita numero desatualizado.
   */
  revalidatePath("/", "layout");

  return { success: true, message: "Configuracoes salvas." };
}
