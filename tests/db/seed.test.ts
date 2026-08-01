// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";

const SEED_PATH = path.resolve(process.cwd(), "supabase/seed.sql");

/**
 * O seed e opcional, mas precisa ser executavel: um seed quebrado so aparece
 * quando alguem tenta usar, geralmente no pior momento.
 */
describe("seed de desenvolvimento", () => {
  let ctx: TestDatabase;
  let seedSql: string;

  beforeAll(async () => {
    ctx = await createTestDatabase();
    seedSql = await readFile(SEED_PATH, "utf8");
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("nao faz nada quando nao existe usuario", async () => {
    await expect(ctx.db.exec(seedSql)).resolves.toBeDefined();

    const result = await ctx.db.query("select id from public.watches");
    expect(result.rows).toEqual([]);
  });

  it("popula um cenario coerente para o primeiro usuario", async () => {
    const ownerId = await ctx.createUser("dono@wata.test");

    await ctx.db.exec(seedSql);

    const watches = await ctx.db.query<{ status: string; tipo: string }>(
      "select status, tipo from public.watches where owner_id = $1 order by wata_id",
      [ownerId],
    );

    expect(watches.rows).toEqual([
      { status: "AVAILABLE", tipo: "OWNED" },
      { status: "RESERVED", tipo: "OWNED" },
      { status: "AVAILABLE", tipo: "CONSIGNED" },
      { status: "SOLD", tipo: "OWNED" },
    ]);
  });

  it("gera indicadores conferiveis no dashboard", async () => {
    const result = await ctx.db.query<{
      caixa: string;
      lucro_realizado: string;
      total_disponivel: string;
    }>("select caixa, lucro_realizado, total_disponivel from public.dashboard_summary");

    // 15000 inicial + 500 sinal + 2450 venda - 300 Meta Ads
    expect(Number(result.rows[0].caixa)).toBe(17650);

    // Casio: 2450 - 1800 compra - 70 envio
    expect(Number(result.rows[0].lucro_realizado)).toBe(580);
    expect(Number(result.rows[0].total_disponivel)).toBe(2);
  });

  it("e idempotente: rodar de novo nao duplica dados", async () => {
    await ctx.db.exec(seedSql);

    const result = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.watches",
    );

    expect(result.rows[0].total).toBe(4);
  });
});
