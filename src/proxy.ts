import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { updateSession } from "@/lib/supabase/session";

/**
 * Rotas acessiveis sem sessao. Tudo que nao estiver aqui exige autenticacao.
 *
 * O proxy e apenas a primeira barreira (checagem otimista). A protecao real dos
 * dados continua sendo RLS no banco + verificacao em cada Server Action.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/esqueci-senha",
  "/nova-senha",
  "/auth/callback",
  "/auth/confirm",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Copia os cookies renovados para uma resposta de redirecionamento. */
function redirectPreservingSession(
  url: URL,
  sessionResponse: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(url);

  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

/** URL de login preservando o destino, para retomar a navegacao depois. */
function loginUrlFor(request: NextRequest): URL {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);

  if (pathname !== "/") {
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
  }

  return loginUrl;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Sem configuracao do Supabase ninguem consegue autenticar, entao rota
   * protegida so levaria a um erro 500 opaco. Mandar para /login faz a tela
   * explicar exatamente qual variavel falta.
   */
  if (!hasSupabaseEnv()) {
    return isPublicRoute(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(loginUrlFor(request));
  }

  const { response, userId } = await updateSession(request);
  const isAuthenticated = userId !== null;

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return redirectPreservingSession(loginUrlFor(request), response);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    return redirectPreservingSession(
      new URL("/dashboard", request.url),
      response,
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Executa em todas as rotas, exceto assets e metadata.
     * Manter o proxy amplo e proposital: rotas novas nascem protegidas.
     *
     * `icon` e as demais rotas de metadata do Next nao tem extensao no
     * caminho, entao precisam de excecao propria: sem ela o navegador recebe
     * um redirecionamento para /login ao buscar o favicon, e a aba fica sem
     * icone — inclusive na propria tela de login.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
