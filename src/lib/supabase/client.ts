import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cliente Supabase para Client Components.
 *
 * Usa exclusivamente a chave publica: qualquer coisa que dependa de privilegio
 * elevado precisa acontecer no servidor. As politicas de RLS sao a fronteira
 * real de autorizacao.
 */
export function createSupabaseBrowserClient() {
  const { url, key } = getSupabaseEnv();

  return createBrowserClient<Database>(url, key);
}
