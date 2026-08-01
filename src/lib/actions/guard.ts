import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getCurrentUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type AuthorizedContext = {
  supabase: SupabaseClient<Database>;
  user: User;
};

/**
 * Erro de autorizacao em Server Action.
 *
 * Server Actions sao endpoints POST publicos: qualquer um pode chama-las
 * diretamente, sem passar pela interface. Cada uma verifica a sessao antes de
 * tocar no banco (Secao 17), mesmo que a tela ja tenha verificado.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Sessao expirada. Entre novamente para continuar.");
    this.name = "UnauthorizedError";
  }
}

/** Devolve o cliente Supabase e o usuario, ou lanca UnauthorizedError. */
export async function requireContext(): Promise<AuthorizedContext> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const supabase = await createSupabaseServerClient();

  return { supabase, user };
}
