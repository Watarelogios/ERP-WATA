import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Camada de acesso a dados de autenticacao.
 *
 * Toda leitura de dados e toda Server Action deve passar por aqui antes de
 * tocar no banco. O proxy faz apenas a checagem otimista de rota; a garantia
 * fica nesta camada e nas politicas de RLS.
 *
 * `cache` memoiza dentro do mesmo render, evitando varias chamadas a getUser().
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();

  /*
   * getUser() valida o token contra o servidor de auth. getSession() apenas le
   * o cookie, que pode ter sido forjado, e por isso nao autoriza nada.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/** Garante sessao valida ou redireciona para o login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
