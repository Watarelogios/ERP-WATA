import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasSupabaseEnv } from "@/lib/env";

/**
 * A raiz nao tem tela propria: encaminha para o dashboard ou para o login.
 *
 * O proxy ja faz esse desvio, mas a pagina o repete para cobrir os casos em que
 * o proxy nao roda (por exemplo, sem configuracao do Supabase).
 */
export default async function RootPage() {
  /*
   * Impede a pre-renderizacao: o destino depende da sessao de quem acessa.
   * Sem isso, um build feito sem variaveis de ambiente congelaria o
   * redirecionamento para /login no HTML estatico.
   */
  await connection();

  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const user = await getCurrentUser();

  redirect(user ? "/dashboard" : "/login");
}
