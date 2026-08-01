"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import {
  reportUnexpectedError,
  type FormState,
} from "@/lib/actions/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
} from "@/lib/validations/auth";

export type LoginFormState = FormState<"email" | "password">;
export type ForgotPasswordFormState = FormState<"email">;
export type NewPasswordFormState = FormState<"password" | "confirmPassword">;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signInAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const destination = safeRedirectPath(
    formData.get("redirectTo")?.toString() ?? null,
  );

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      console.error("[wata] signIn", error.message);

      /*
       * Mensagem unica para credencial errada e usuario inexistente: distinguir
       * os dois casos permitiria enumerar quais e-mails tem conta.
       */
      return { message: "E-mail ou senha incorretos." };
    }
  } catch (error) {
    return reportUnexpectedError(
      "signIn",
      error,
      "Nao foi possivel entrar agora. Verifique sua conexao e tente novamente.",
    );
  }

  // redirect lanca excecao de controle de fluxo: precisa ficar fora do try.
  redirect(destination);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[wata] signOut", error);
  }

  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${appUrl()}/auth/confirm?next=/nova-senha` },
    );

    if (error) {
      console.error("[wata] requestPasswordReset", error.message);
    }
  } catch (error) {
    return reportUnexpectedError(
      "requestPasswordReset",
      error,
      "Nao foi possivel enviar o e-mail agora. Tente novamente.",
    );
  }

  /*
   * Sempre a mesma resposta, exista ou nao a conta: caso contrario a tela vira
   * um verificador de e-mails cadastrados.
   */
  return {
    success: true,
    message:
      "Se houver uma conta com esse e-mail, o link de redefinicao foi enviado.",
  };
}

export async function updatePasswordAction(
  _prevState: NewPasswordFormState,
  formData: FormData,
): Promise<NewPasswordFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // A sessao de recuperacao vem do link do e-mail; sem ela nada e alterado.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        message:
          "O link de redefinicao expirou. Solicite um novo e-mail para continuar.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      console.error("[wata] updatePassword", error.message);

      return {
        message: "Nao foi possivel alterar a senha. Tente novamente.",
      };
    }
  } catch (error) {
    return reportUnexpectedError("updatePassword", error);
  }

  redirect("/dashboard");
}
