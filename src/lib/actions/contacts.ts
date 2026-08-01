"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { requireContext, UnauthorizedError } from "@/lib/actions/guard";
import { clientSchema, supplierSchema } from "@/lib/validations/contacts";

export type ClientFormState = FormState<
  "nome" | "cidade" | "telefone" | "instagram" | "interesses" | "observacoes"
>;

export type SupplierFormState = FormState<
  | "nome"
  | "cidade"
  | "telefone"
  | "instagram"
  | "tipo_relacao"
  | "observacoes"
>;

/*
 * O id chega por campo oculto. A propriedade e garantida pelo RLS: um update
 * com id de outro usuario simplesmente nao afeta linha nenhuma.
 */

export async function saveClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse({
    nome: formData.get("nome"),
    cidade: formData.get("cidade") ?? "",
    telefone: formData.get("telefone") ?? "",
    instagram: formData.get("instagram") ?? "",
    interesses: formData.get("interesses") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const id = formData.get("id")?.toString() || null;

  try {
    const { supabase, user } = await requireContext();

    if (id) {
      const { data, error } = await supabase
        .from("clients")
        .update(parsed.data)
        .eq("id", id)
        .select("id");

      if (error) {
        throw error;
      }

      if (!data?.length) {
        return { message: "Cliente nao encontrado. Atualize a lista." };
      }
    } else {
      const { error } = await supabase
        .from("clients")
        .insert({ ...parsed.data, owner_id: user.id });

      if (error) {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "saveClient",
      error,
      "Nao foi possivel salvar o cliente. Tente novamente.",
    );
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function setClientActiveAction(
  id: string,
  ativo: boolean,
): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    const { data, error } = await supabase
      .from("clients")
      .update({ ativo })
      .eq("id", id)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return { message: "Cliente nao encontrado." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("setClientActive", error);
  }

  revalidatePath("/clientes");

  return {
    success: true,
    message: ativo ? "Cliente reativado." : "Cliente inativado.",
  };
}

export async function saveSupplierAction(
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const parsed = supplierSchema.safeParse({
    nome: formData.get("nome"),
    cidade: formData.get("cidade") ?? "",
    telefone: formData.get("telefone") ?? "",
    instagram: formData.get("instagram") ?? "",
    tipo_relacao: formData.get("tipo_relacao"),
    observacoes: formData.get("observacoes") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const id = formData.get("id")?.toString() || null;

  try {
    const { supabase, user } = await requireContext();

    if (id) {
      const { data, error } = await supabase
        .from("suppliers")
        .update(parsed.data)
        .eq("id", id)
        .select("id");

      if (error) {
        throw error;
      }

      if (!data?.length) {
        return { message: "Fornecedor nao encontrado. Atualize a lista." };
      }
    } else {
      const { error } = await supabase
        .from("suppliers")
        .insert({ ...parsed.data, owner_id: user.id });

      if (error) {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError(
      "saveSupplier",
      error,
      "Nao foi possivel salvar o fornecedor. Tente novamente.",
    );
  }

  revalidatePath("/fornecedores");
  redirect("/fornecedores");
}

export async function setSupplierActiveAction(
  id: string,
  ativo: boolean,
): Promise<FormState> {
  try {
    const { supabase } = await requireContext();

    const { data, error } = await supabase
      .from("suppliers")
      .update({ ativo })
      .eq("id", id)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data?.length) {
      return { message: "Fornecedor nao encontrado." };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { message: error.message };
    }

    return reportUnexpectedError("setSupplierActive", error);
  }

  revalidatePath("/fornecedores");

  return {
    success: true,
    message: ativo ? "Fornecedor reativado." : "Fornecedor inativado.",
  };
}
