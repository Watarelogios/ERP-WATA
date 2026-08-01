// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import { createSupplier } from "./helpers/fixtures";

/**
 * Confirmar compra (Secao 13.1).
 *
 * Cenario critico da Secao 19.1: "Oportunidade PURCHASED cria relogio e saida
 * financeira uma unica vez" e "Falha no meio de compra/venda nao deixa
 * registros parciais".
 */
describe("confirm_purchase", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;
  let supplierId: string;

  async function novaOportunidade(modelo = "Speedmaster") {
    const result = await ctx.db.query<{ id: string }>(
      `insert into public.purchase_opportunities
         (owner_id, modelo, valor_pedido, minha_oferta)
       values ($1, $2, 4000, 3500) returning id`,
      [owner, modelo],
    );

    return result.rows[0].id;
  }

  async function confirmar(
    opportunityId: string,
    valor = 3500,
    userId = owner,
  ) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{ watch_id: string; wata_id: string }>(
        // Argumentos nomeados: a ordem posicional dos opcionais nao importa.
        `select * from public.confirm_purchase(
           p_opportunity_id => $1,
           p_valor_fechado => $2,
           p_marca => 'Omega',
           p_modelo => 'Speedmaster',
           p_supplier_id => $3
         )`,
        [opportunityId, valor, supplierId],
      ),
    );
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");
    supplierId = await createSupplier(ctx.db, owner);

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 10000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("cria relogio, despesa e saida de caixa de uma vez", async () => {
    const opportunityId = await novaOportunidade();
    const result = await confirmar(opportunityId, 3500);

    const { watch_id: watchId, wata_id: wataId } = result.rows[0];
    expect(wataId).toMatch(/^WATA-\d{4}$/);

    const watch = await ctx.db.query<{
      tipo: string;
      status: string;
      valor_compra: string;
    }>("select tipo, status, valor_compra from public.watches where id = $1", [
      watchId,
    ]);
    expect(watch.rows[0].tipo).toBe("OWNED");
    expect(watch.rows[0].status).toBe("AVAILABLE");
    expect(Number(watch.rows[0].valor_compra)).toBe(3500);

    const despesa = await ctx.db.query<{ categoria: string; valor: string }>(
      "select categoria, valor from public.expenses where watch_id = $1",
      [watchId],
    );
    expect(despesa.rows).toHaveLength(1);
    expect(despesa.rows[0].categoria).toBe("PURCHASE");

    const lancamento = await ctx.db.query<{
      direcao: string;
      status: string;
      valor: string;
    }>(
      "select direcao, status, valor from public.financial_transactions where watch_id = $1",
      [watchId],
    );
    expect(lancamento.rows).toHaveLength(1);
    expect(lancamento.rows[0].direcao).toBe("EXPENSE");
    expect(lancamento.rows[0].status).toBe("CONFIRMED");
    expect(Number(lancamento.rows[0].valor)).toBe(3500);
  });

  it("encerra a oportunidade apontando para o relogio criado", async () => {
    const opportunityId = await novaOportunidade("Seamaster");
    const { watch_id: watchId } = (await confirmar(opportunityId, 2800)).rows[0];

    const opp = await ctx.db.query<{
      status: string;
      purchased_watch_id: string;
      valor_fechado: string;
    }>(
      "select status, purchased_watch_id, valor_fechado from public.purchase_opportunities where id = $1",
      [opportunityId],
    );

    expect(opp.rows[0].status).toBe("PURCHASED");
    expect(opp.rows[0].purchased_watch_id).toBe(watchId);
    expect(Number(opp.rows[0].valor_fechado)).toBe(2800);
  });

  it("registra a entrada no historico do relogio", async () => {
    const opportunityId = await novaOportunidade("Aqua Terra");
    const { watch_id: watchId } = (await confirmar(opportunityId)).rows[0];

    const historico = await ctx.db.query<{ status_novo: string }>(
      "select status_novo from public.watch_status_history where watch_id = $1",
      [watchId],
    );

    expect(historico.rows).toHaveLength(1);
    expect(historico.rows[0].status_novo).toBe("AVAILABLE");
  });

  it("reduz o caixa exatamente pelo valor fechado", async () => {
    const antes = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    const opportunityId = await novaOportunidade("Constellation");
    await confirmar(opportunityId, 1200);

    const depois = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    expect(Number(depois.rows[0].caixa)).toBe(
      Number(antes.rows[0].caixa) - 1200,
    );
  });

  it("recusa confirmar a mesma oportunidade duas vezes", async () => {
    const opportunityId = await novaOportunidade("De Ville");
    await confirmar(opportunityId);

    await expect(confirmar(opportunityId)).rejects.toThrow(/ja foi encerrada/i);
  });

  it("nao deixa registro parcial quando a operacao falha", async () => {
    const opportunityId = await novaOportunidade("Railmaster");

    const watchesAntes = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.watches",
    );
    const lancamentosAntes = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.financial_transactions",
    );

    // Valor negativo e barrado antes de qualquer insert.
    await expect(confirmar(opportunityId, -100)).rejects.toThrow(
      /valor fechado/i,
    );

    const watchesDepois = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.watches",
    );
    const lancamentosDepois = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.financial_transactions",
    );

    expect(watchesDepois.rows[0].total).toBe(watchesAntes.rows[0].total);
    expect(lancamentosDepois.rows[0].total).toBe(lancamentosAntes.rows[0].total);

    // A oportunidade continua negociando, pronta para nova tentativa.
    const opp = await ctx.db.query<{ status: string }>(
      "select status from public.purchase_opportunities where id = $1",
      [opportunityId],
    );
    expect(opp.rows[0].status).toBe("NEGOTIATING");
  });

  it("desfaz tudo quando um passo posterior falha", async () => {
    /*
     * Um lancamento com a mesma chave de idempotencia ja existente faz o
     * INSERT do caixa falhar no meio da funcao. O relogio inserido no passo
     * anterior tem de desaparecer junto.
     */
    const opportunityId = await novaOportunidade("Flightmaster");

    await ctx.db.query(
      `insert into public.financial_transactions
         (owner_id, direcao, categoria, valor, idempotency_key)
       values ($1, 'EXPENSE', 'PURCHASE', 1, $2)`,
      [owner, `purchase:${opportunityId}`],
    );

    const antes = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.watches",
    );

    await expect(confirmar(opportunityId)).rejects.toThrow();

    const depois = await ctx.db.query<{ total: number }>(
      "select count(*)::int as total from public.watches",
    );

    expect(depois.rows[0].total).toBe(antes.rows[0].total);
  });

  it("nao permite confirmar oportunidade de outro usuario", async () => {
    const opportunityId = await novaOportunidade("Ploprof");

    await expect(confirmar(opportunityId, 3500, outro)).rejects.toThrow(
      /nao encontrada/i,
    );

    const opp = await ctx.db.query<{ status: string }>(
      "select status from public.purchase_opportunities where id = $1",
      [opportunityId],
    );
    expect(opp.rows[0].status).toBe("NEGOTIATING");
  });

  it("nao conta a despesa de compra duas vezes no lucro", async () => {
    const opportunityId = await novaOportunidade("Chronostop");
    const { watch_id: watchId } = (await confirmar(opportunityId, 1000)).rows[0];

    const cliente = await ctx.db.query<{ id: string }>(
      "insert into public.clients (owner_id, nome) values ($1, 'Cliente') returning id",
      [owner],
    );

    const sale = await ctx.db.query<{ id: string }>(
      `insert into public.sales (owner_id, watch_id, client_id, valor_venda)
       values ($1, $2, $3, 2000) returning id`,
      [owner, watchId, cliente.rows[0].id],
    );

    const lucro = await ctx.db.query<{ lucro_liquido: string }>(
      "select lucro_liquido from public.sales where id = $1",
      [sale.rows[0].id],
    );

    // 2000 - 1000 de compra, e nao 2000 - 1000 - 1000 da despesa PURCHASE.
    expect(Number(lucro.rows[0].lucro_liquido)).toBe(1000);
  });
});
