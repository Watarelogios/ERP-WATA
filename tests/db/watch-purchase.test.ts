// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import {
  createClient,
  createConsignment,
  createSupplier,
  createWatch,
} from "./helpers/fixtures";

/**
 * Lancar no caixa a compra de um relogio cadastrado direto no estoque.
 *
 * Cadastrar nao movimenta o caixa — correto para estoque antigo, mas a compra
 * feita hoje precisa aparecer no livro caixa.
 */
describe("register_watch_purchase", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;
  let supplierId: string;

  async function caixa() {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    return Number(result.rows[0].caixa);
  }

  async function lancar(watchId: string, userId = owner) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{ valor: string; transaction_id: string }>(
        "select * from public.register_watch_purchase(p_watch_id => $1)",
        [watchId],
      ),
    );
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");
    supplierId = await createSupplier(ctx.db, owner);

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 20000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("cadastrar relogio sozinho nao mexe no caixa", async () => {
    const antes = await caixa();

    await createWatch(ctx.db, owner, { valorCompra: 2000 });

    expect(await caixa()).toBe(antes);
  });

  it("lanca a saida e a despesa juntas", async () => {
    const antes = await caixa();
    const watch = await createWatch(ctx.db, owner, { valorCompra: 3000 });

    const result = await lancar(watch.id);

    expect(Number(result.rows[0].valor)).toBe(3000);
    expect(await caixa()).toBe(antes - 3000);

    const lancamento = await ctx.db.query<{
      direcao: string;
      categoria: string;
      status: string;
    }>(
      "select direcao, categoria, status from public.financial_transactions where watch_id = $1",
      [watch.id],
    );
    expect(lancamento.rows).toEqual([
      { direcao: "EXPENSE", categoria: "PURCHASE", status: "CONFIRMED" },
    ]);

    const despesa = await ctx.db.query<{ categoria: string }>(
      "select categoria from public.expenses where watch_id = $1",
      [watch.id],
    );
    expect(despesa.rows).toEqual([{ categoria: "PURCHASE" }]);
  });

  it("recusa lancar a mesma compra duas vezes", async () => {
    const watch = await createWatch(ctx.db, owner, { valorCompra: 1200 });
    await lancar(watch.id);

    const antes = await caixa();
    await expect(lancar(watch.id)).rejects.toThrow(
      /financial_idempotency_unica/,
    );

    // O caixa nao se move na tentativa recusada.
    expect(await caixa()).toBe(antes);
  });

  it("nao deixa despesa orfa quando o lancamento falha", async () => {
    const watch = await createWatch(ctx.db, owner, { valorCompra: 800 });
    await lancar(watch.id);

    const antes = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.expenses",
    );

    await expect(lancar(watch.id)).rejects.toThrow();

    const depois = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.expenses",
    );

    expect(depois.rows[0].total).toBe(antes.rows[0].total);
  });

  it("recusa relogio consignado", async () => {
    const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });
    await createConsignment(ctx.db, owner, watch.id, supplierId, {
      modalidade: "FIXED_PAYOUT",
      valorRepasseFixo: 2000,
    });

    await expect(lancar(watch.id)).rejects.toThrow(/somente relogio proprio/i);
  });

  it("nao lanca compra de relogio de outro usuario", async () => {
    const watch = await createWatch(ctx.db, owner, { valorCompra: 900 });

    await expect(lancar(watch.id, outro)).rejects.toThrow(/nao encontrado/i);
  });

  it("nao contamina a margem da venda", async () => {
    /*
     * A despesa criada aqui tem categoria PURCHASE, ignorada por
     * watch_linked_expenses: o custo ja e o valor_compra do relogio.
     */
    const clientId = await createClient(ctx.db, owner, "Cliente");
    const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

    await lancar(watch.id);

    const sale = await ctx.db.query<{ id: string }>(
      `insert into public.sales (owner_id, watch_id, client_id, valor_venda)
       values ($1, $2, $3, 2600) returning id`,
      [owner, watch.id, clientId],
    );

    const lucro = await ctx.db.query<{ lucro_liquido: string }>(
      "select lucro_liquido from public.sales where id = $1",
      [sale.rows[0].id],
    );

    // 2600 - 1000, e nao 2600 - 1000 - 1000.
    expect(Number(lucro.rows[0].lucro_liquido)).toBe(1600);
  });
});
