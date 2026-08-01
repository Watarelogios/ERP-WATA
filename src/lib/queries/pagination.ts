export const PAGE_SIZE = 20;

export type PageParams = {
  page: number;
  from: number;
  to: number;
};

/** Converte o parametro `pagina` da URL em um range para o Supabase. */
export function pageRange(raw: string | undefined): PageParams {
  const parsed = Number(raw);
  const page =
    Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;

  const from = (page - 1) * PAGE_SIZE;

  return { page, from, to: from + PAGE_SIZE - 1 };
}

/**
 * Monta a query string preservando os parametros atuais.
 *
 * Usada pelos links de paginacao e ordenacao, para que busca e filtros nao se
 * percam ao navegar.
 */
export function buildQueryString(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }

  const text = params.toString();

  return text ? `?${text}` : "";
}
