const DEFAULT_REDIRECT = "/dashboard";

/**
 * Aceita apenas caminhos internos como destino pos-login.
 *
 * Sem esta checagem, `?redirectTo=https://site-malicioso` transformaria a tela
 * de login em um redirecionador aberto para phishing.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!value) {
    return fallback;
  }

  // "//host" e "/\host" sao interpretados pelo navegador como URL absoluta.
  const isInternalPath =
    value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");

  return isInternalPath ? value : fallback;
}
