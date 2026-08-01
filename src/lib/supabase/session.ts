import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export type SessionUpdate = {
  /** Resposta ja com os cookies renovados; deve ser devolvida ou copiada. */
  response: NextResponse;
  /** ID do usuario autenticado, ou null quando nao ha sessao valida. */
  userId: string | null;
};

/**
 * Renova a sessao do Supabase durante o proxy.
 *
 * O token de acesso expira; sem esta renovacao o usuario e deslogado no meio da
 * navegacao. A resposta devolvida carrega os cookies atualizados e por isso
 * nunca pode ser descartada — se for preciso redirecionar, copie os cookies.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdate> {
  const { url, key } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        /*
         * Respostas que renovam cookies de autenticacao nao podem ser cacheadas
         * por CDN, sob risco de entregar a sessao de um usuario a outro.
         */
        for (const [headerName, headerValue] of Object.entries(headers)) {
          response.headers.set(headerName, headerValue);
        }
      },
    },
  });

  /*
   * getUser() valida o token junto ao servidor de auth. getSession() apenas le
   * o cookie e por isso nao serve como base de autorizacao.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
