/**
 * Dinheiro em centavos.
 *
 * Ponto flutuante nao representa decimais exatamente (0.1 + 0.2 !== 0.3), e um
 * erro de arredondamento em ERP vira divergencia de caixa. Toda conta acontece
 * em centavos inteiros; a conversao para reais so ocorre na apresentacao.
 *
 * O banco guarda numeric(14,2) e devolve string ou number — `toCents` aceita os
 * dois e nunca perde precisao no caminho.
 */

export const CURRENCY = "BRL";
export const LOCALE = "pt-BR";

/** Maior valor aceito: numeric(14,2) comporta 12 digitos antes da virgula. */
export const MAX_CENTS = 99_999_999_999_99;

const brlFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte o valor vindo do banco (numeric) para centavos inteiros.
 *
 * A string e parseada digito a digito em vez de via Number(), porque
 * `Number("0.29") * 100` resulta em 28.999999999999996.
 */
export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.round(value * 100);
  }

  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const [inteiro = "0", decimal = ""] = trimmed.replace("-", "").split(".");

  const centavos = `${decimal}00`.slice(0, 2);
  const total = Number(inteiro) * 100 + Number(centavos);

  return negative ? -total : total;
}

/** Converte centavos para o formato aceito pelo banco: "1234.56". */
export function centsToDatabase(cents: number): string {
  const rounded = Math.round(cents);
  const sinal = rounded < 0 ? "-" : "";
  const absoluto = Math.abs(rounded);

  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`;
}

/** Formata centavos como moeda: 199990 -> "R$ 1.999,90". */
export function formatBRL(cents: number): string {
  return brlFormatter.format(Math.round(cents) / 100);
}

/** Formata sem o simbolo, para uso dentro de inputs: 199990 -> "1.999,90". */
export function formatAmount(cents: number): string {
  return decimalFormatter.format(Math.round(cents) / 100);
}

/**
 * Le o que o usuario digitou e devolve centavos.
 *
 * Aceita "1.999,90", "1999,90", "R$ 1.999,90" e "1999.90". A regra decisiva e a
 * do pt-BR: virgula separa decimal, ponto agrupa milhar. Quando so existe ponto
 * e ele deixa exatamente dois digitos no fim, e tratado como decimal — e o que
 * acontece ao colar um valor copiado de planilha.
 */
export function parseBRL(input: string | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  const limpo = input.replace(/[^\d,.-]/g, "").trim();

  if (limpo === "" || limpo === "-") {
    return null;
  }

  const negative = limpo.startsWith("-");
  const semSinal = limpo.replace(/-/g, "");

  let normalizado: string;

  if (semSinal.includes(",")) {
    // Virgula presente: ela e o separador decimal; pontos sao milhar.
    const [inteiro, ...resto] = semSinal.split(",");
    normalizado = `${inteiro.replace(/\./g, "")}.${resto.join("")}`;
  } else {
    const partes = semSinal.split(".");

    if (partes.length > 1 && partes[partes.length - 1].length === 2) {
      // "1999.90" — ponto decimal vindo de planilha ou colagem.
      normalizado = `${partes.slice(0, -1).join("")}.${partes[partes.length - 1]}`;
    } else {
      // "1.999" — ponto como separador de milhar.
      normalizado = partes.join("");
    }
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return null;
  }

  const cents = Math.round(numero * 100);

  return negative ? -cents : cents;
}

/** Aplica mascara enquanto o usuario digita, tratando a entrada como centavos. */
export function maskBRLInput(raw: string): string {
  const digitos = raw.replace(/\D/g, "");

  if (digitos === "") {
    return "";
  }

  const cents = Math.min(Number(digitos), MAX_CENTS);

  return formatAmount(cents);
}

export function isValidMoney(cents: number | null): cents is number {
  return (
    cents !== null &&
    Number.isFinite(cents) &&
    Number.isInteger(cents) &&
    cents >= 0 &&
    cents <= MAX_CENTS
  );
}
