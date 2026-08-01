import { describe, expect, it } from "vitest";

import {
  isActivePath,
  NAV_ITEMS,
  PRIMARY_MOBILE_ITEMS,
  SECONDARY_MOBILE_ITEMS,
} from "@/components/layout/nav-items";

describe("NAV_ITEMS", () => {
  it("cobre todos os modulos do MVP", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/dashboard",
      "/estoque",
      "/compras",
      "/reservas",
      "/vendas",
      "/financeiro",
      "/clientes",
      "/fornecedores",
      "/configuracoes",
    ]);
  });

  it("distribui todos os itens entre barra inferior e menu Mais", () => {
    expect(
      PRIMARY_MOBILE_ITEMS.length + SECONDARY_MOBILE_ITEMS.length,
    ).toBe(NAV_ITEMS.length);
  });

  it("mantem a barra inferior com no maximo 4 atalhos mais o botao Mais", () => {
    expect(PRIMARY_MOBILE_ITEMS.length).toBeLessThanOrEqual(4);
  });
});

describe("isActivePath", () => {
  it("marca a rota exata", () => {
    expect(isActivePath("/estoque", "/estoque")).toBe(true);
  });

  it("marca subrotas do modulo", () => {
    expect(isActivePath("/estoque/novo", "/estoque")).toBe(true);
    expect(isActivePath("/estoque/abc-123", "/estoque")).toBe(true);
  });

  it("nao confunde prefixos parecidos", () => {
    expect(isActivePath("/estoquex", "/estoque")).toBe(false);
    expect(isActivePath("/vendas", "/estoque")).toBe(false);
  });
});
