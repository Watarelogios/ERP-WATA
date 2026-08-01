import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

/**
 * Callback do fluxo PKCE do Supabase Auth.
 *
 * Recebe `code` e troca por uma sessao. Precisa estar entre as Redirect URLs
 * permitidas no painel do Supabase, para ambiente local e para producao.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirect(next);
    }

    console.error("[wata] auth/callback", error.message);
  }

  redirect("/login?erro=link-invalido");
}
