import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * `cookies()` e assincrono a partir do Next.js 16, por isso a funcao tambem e.
 * A sessao vive em cookies httpOnly e toda leitura passa por RLS.
 */
export async function createSupabaseServerClient() {
  /*
   * `cookies()` vem antes da validacao de ambiente de proposito: ele marca a
   * rota como dinamica. Sem isso o build tentaria pre-renderizar telas que
   * dependem de sessao e falharia em qualquer maquina sem .env configurado.
   */
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /*
           * Server Components nao podem escrever cookies. Isso e esperado: o
           * proxy renova a sessao antes da renderizacao, entao ignorar aqui nao
           * causa perda de sessao.
           */
        }
      },
    },
  });
}
