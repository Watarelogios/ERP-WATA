// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import { createWatch } from "./helpers/fixtures";

/**
 * WATA-ID (Secao 11 e cenarios criticos da Secao 19.1).
 */
describe("WATA-ID", () => {
  let ctx: TestDatabase;
  let ownerId: string;

  beforeAll(async () => {
    ctx = await createTestDatabase();
    ownerId = await ctx.createUser("dono@wata.test");
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("da o codigo WATA-0001 ao primeiro relogio", async () => {
    const watch = await createWatch(ctx.db, ownerId);

    expect(watch.wataId).toBe("WATA-0001");
  });

  it("avanca sequencialmente com zeros a esquerda", async () => {
    const segundo = await createWatch(ctx.db, ownerId);
    const terceiro = await createWatch(ctx.db, ownerId);

    expect(segundo.wataId).toBe("WATA-0002");
    expect(terceiro.wataId).toBe("WATA-0003");
  });

  it("gera codigos diferentes para insercoes concorrentes", async () => {
    // Cenario da Secao 19.1: duas requisicoes simultaneas.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createWatch(ctx.db, ownerId)),
    );

    const codigos = results.map((watch) => watch.wataId);

    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("nao reutiliza codigo apos exclusao logica nem fisica", async () => {
    const alvo = await createWatch(ctx.db, ownerId);

    await ctx.db.query("delete from public.watches where id = $1", [alvo.id]);

    const seguinte = await createWatch(ctx.db, ownerId);

    expect(seguinte.wataId).not.toBe(alvo.wataId);
    expect(Number(seguinte.wataId.replace("WATA-", ""))).toBeGreaterThan(
      Number(alvo.wataId.replace("WATA-", "")),
    );
  });

  it("rejeita alteracao do codigo depois de criado", async () => {
    const watch = await createWatch(ctx.db, ownerId);

    await expect(
      ctx.db.query("update public.watches set wata_id = $1 where id = $2", [
        "WATA-9999",
        watch.id,
      ]),
    ).rejects.toThrow(/imutavel/i);
  });

  it("permite atualizar outros campos sem tocar no codigo", async () => {
    const watch = await createWatch(ctx.db, ownerId);

    await ctx.db.query(
      "update public.watches set valor_anunciado = $1 where id = $2",
      [3500, watch.id],
    );

    const result = await ctx.db.query<{ wata_id: string }>(
      "select wata_id from public.watches where id = $1",
      [watch.id],
    );

    expect(result.rows[0].wata_id).toBe(watch.wataId);
  });

  it("impede codigo duplicado", async () => {
    const watch = await createWatch(ctx.db, ownerId);

    await expect(
      ctx.db.query(
        `insert into public.watches (owner_id, marca, modelo, tipo, valor_compra, wata_id)
         values ($1, 'Tissot', 'PRX', 'OWNED', 500, $2)`,
        [ownerId, watch.wataId],
      ),
    ).rejects.toThrow();
  });
});
