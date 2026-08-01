import { describe, expect, it } from "vitest";

import {
  centsToDatabase,
  formatAmount,
  formatBRL,
  isValidMoney,
  maskBRLInput,
  parseBRL,
  toCents,
} from "@/lib/money";

describe("toCents", () => {
  it("converte o numeric do banco sem perder precisao", () => {
    expect(toCents("1999.90")).toBe(199990);
    expect(toCents("0.29")).toBe(29);
    expect(toCents("1234.05")).toBe(123405);
  });

  it("nao sofre com erro de ponto flutuante", () => {
    // Number("0.29") * 100 === 28.999999999999996
    expect(toCents("0.29")).toBe(29);
    expect(toCents("8.20")).toBe(820);
    expect(toCents("1.10")).toBe(110);
  });

  it("aceita valores sem casa decimal", () => {
    expect(toCents("1500")).toBe(150000);
    expect(toCents("0")).toBe(0);
  });

  it("aceita number alem de string", () => {
    expect(toCents(1999.9)).toBe(199990);
    expect(toCents(0)).toBe(0);
  });

  it("trata nulo, vazio e invalido como zero", () => {
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
    expect(toCents("")).toBe(0);
    expect(toCents(Number.NaN)).toBe(0);
  });

  it("preserva o sinal negativo", () => {
    expect(toCents("-250.50")).toBe(-25050);
  });
});

describe("centsToDatabase", () => {
  it("devolve o formato aceito por numeric(14,2)", () => {
    expect(centsToDatabase(199990)).toBe("1999.90");
    expect(centsToDatabase(29)).toBe("0.29");
    expect(centsToDatabase(0)).toBe("0.00");
    expect(centsToDatabase(150000)).toBe("1500.00");
  });

  it("preserva o sinal negativo", () => {
    expect(centsToDatabase(-25050)).toBe("-250.50");
  });

  it("faz o caminho de volta sem perda", () => {
    for (const valor of ["1999.90", "0.29", "0.00", "12345.67", "8.20"]) {
      expect(centsToDatabase(toCents(valor))).toBe(valor);
    }
  });
});

describe("formatBRL", () => {
  it("formata como moeda brasileira", () => {
    // O Intl usa espaco nao separavel entre simbolo e valor.
    expect(formatBRL(199990).replace(/ /g, " ")).toBe("R$ 1.999,90");
    expect(formatBRL(0).replace(/ /g, " ")).toBe("R$ 0,00");
    expect(formatBRL(29).replace(/ /g, " ")).toBe("R$ 0,29");
  });

  it("mantem duas casas mesmo em valores redondos", () => {
    expect(formatBRL(150000).replace(/ /g, " ")).toBe("R$ 1.500,00");
  });
});

describe("formatAmount", () => {
  it("formata sem o simbolo, para uso em input", () => {
    expect(formatAmount(199990)).toBe("1.999,90");
    expect(formatAmount(0)).toBe("0,00");
  });
});

describe("parseBRL", () => {
  it("le o formato brasileiro completo", () => {
    expect(parseBRL("R$ 1.999,90")).toBe(199990);
    expect(parseBRL("1.999,90")).toBe(199990);
    expect(parseBRL("1999,90")).toBe(199990);
  });

  it("le valor colado de planilha com ponto decimal", () => {
    expect(parseBRL("1999.90")).toBe(199990);
    expect(parseBRL("8.20")).toBe(820);
  });

  it("trata ponto como milhar quando nao sobram duas casas", () => {
    expect(parseBRL("1.999")).toBe(199900);
    expect(parseBRL("1.234.567")).toBe(123456700);
  });

  it("aceita valor inteiro", () => {
    expect(parseBRL("1500")).toBe(150000);
    expect(parseBRL("0")).toBe(0);
  });

  it("devolve null para entrada vazia ou sem digito", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("   ")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL(null)).toBeNull();
    expect(parseBRL(undefined)).toBeNull();
  });

  it("ignora simbolos e espacos", () => {
    expect(parseBRL(" R$  2.500,00 ")).toBe(250000);
  });
});

describe("maskBRLInput", () => {
  it("interpreta a digitacao como centavos", () => {
    expect(maskBRLInput("1")).toBe("0,01");
    expect(maskBRLInput("12")).toBe("0,12");
    expect(maskBRLInput("123")).toBe("1,23");
    expect(maskBRLInput("199990")).toBe("1.999,90");
  });

  it("descarta qualquer caractere que nao seja digito", () => {
    expect(maskBRLInput("R$ 1.999,90")).toBe("1.999,90");
  });

  it("devolve vazio quando nao ha digito", () => {
    expect(maskBRLInput("")).toBe("");
    expect(maskBRLInput("R$")).toBe("");
  });
});

describe("isValidMoney", () => {
  it("aceita inteiro nao negativo dentro do limite", () => {
    expect(isValidMoney(0)).toBe(true);
    expect(isValidMoney(199990)).toBe(true);
  });

  it("recusa negativo, fracionado, nulo e infinito", () => {
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidMoney(10.5)).toBe(false);
    expect(isValidMoney(null)).toBe(false);
    expect(isValidMoney(Number.NaN)).toBe(false);
    expect(isValidMoney(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("integracao de ponta a ponta", () => {
  it("digitacao -> centavos -> banco -> exibicao", () => {
    const digitado = maskBRLInput("349990");
    expect(digitado).toBe("3.499,90");

    const cents = parseBRL(digitado);
    expect(cents).toBe(349990);

    const paraBanco = centsToDatabase(cents!);
    expect(paraBanco).toBe("3499.90");

    const doBanco = toCents(paraBanco);
    expect(formatBRL(doBanco).replace(/ /g, " ")).toBe("R$ 3.499,90");
  });
});
