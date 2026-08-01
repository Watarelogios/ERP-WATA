import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

/**
 * Confirma links enviados por e-mail (convite, confirmacao e recuperacao).
 *
 * O Supabase envia `token_hash` + `type`; a troca por sessao acontece aqui, no
 * servidor, e os cookies resultantes seguem na resposta do redirecionamento.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirect(next);
    }

    console.error("[wata] auth/confirm", error.message);
  }

  redirect("/login?erro=link-invalido");
}
