import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/utils/safe-redirect";

describe("safeRedirectPath", () => {
  it("mantem caminhos internos", () => {
    expect(safeRedirectPath("/estoque")).toBe("/estoque");
    expect(safeRedirectPath("/estoque?status=AVAILABLE")).toBe(
      "/estoque?status=AVAILABLE",
    );
  });

  it("usa o destino padrao quando nao ha valor", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("rejeita destinos externos para impedir redirecionamento aberto", () => {
    expect(safeRedirectPath("https://site-malicioso.example")).toBe(
      "/dashboard",
    );
    expect(safeRedirectPath("//site-malicioso.example")).toBe("/dashboard");
    expect(safeRedirectPath("/\\site-malicioso.example")).toBe("/dashboard");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("aceita um destino padrao alternativo", () => {
    expect(safeRedirectPath(null, "/login")).toBe("/login");
  });
});
