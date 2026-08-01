import { APP_TIMEZONE } from "@/lib/env";

/**
 * Datas de referencia da aplicacao.
 *
 * Ficam fora de arquivos de componente de proposito: `Date.now()` durante o
 * render e impuro, e o lint do React sinaliza — com razao, porque o valor
 * mudaria entre renderizacoes. Aqui sao funcoes chamadas por Server Components,
 * que ja renderizam uma vez por requisicao.
 */

/** Data de hoje no formato aceito por `<input type="date">` (AAAA-MM-DD). */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Data daqui a N dias, no mesmo formato. */
export function emDiasISO(dias: number): string {
  return new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
}

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: APP_TIMEZONE,
});

/**
 * Formata uma data vinda do banco para exibicao em pt-BR.
 *
 * O meio-dia evita que o deslocamento de fuso jogue a data para o dia anterior
 * na exibicao — o banco guarda `date`, sem hora.
 */
export function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T12:00:00`));
}
