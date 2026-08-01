// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import {
  createClient,
  createConsignment,
  createExpense,
  createSale,
  createSupplier,
  createWatch,
} from "./helpers/fixtures";

type Summary = {
  capital_investido: string;
  valor_estoque: string;
  lucro_potencial_proprio: string;
  lucro_minimo_proprio: string;
  lucro_realizado: string;
  caixa: string;
  total_disponivel: string;
  total_reservado: string;
  total_vendido: string;
  repasses_pendentes: string;
};

/**
 * Views do dashboard (Secao 14).
 *
 * O dashboard nao guarda total nenhum: cada numero e conferido aqui contra as
 * formulas da Secao 12.
 */
describe("views do dashboard", () => {
  let ctx: TestDatabase;
  let ownerId: string;

  async function summary(): Promise<Summary> {
    const result = await ctx.db.query<Summary>(
      "select * from public.dashboard_summary where owner_id = $1",
      [ownerId],
    );

    return result.rows[0];
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    ownerId = await ctx.createUser("dono@wata.test");

    await ctx.db.query(
      `insert into public.settings (owner_id, saldo_inicial, dias_estoque_parado)
       values ($1, 10000, 60)`,
      [ownerId],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("parte de zero com o saldo inicial configurado", async () => {
    const row = await summary();

    expect(Number(row.capital_investido)).toBe(0);
    expect(Number(row.valor_estoque)).toBe(0);
    expect(Number(row.caixa)).toBe(10000);
  });

  it("soma capital investido apenas dos proprios, com despesas", async () => {
    const proprio = await createWatch(ctx.db, ownerId, {
      valorCompra: 3000,
      valorAnunciado: 5000,
      valorMinimo: 4500,
    });

    await createExpense(ctx.db, ownerId, {
      watchId: proprio.id,
      categoria: "SERVICE",
      valor: 200,
    });

    // Consignado nao imobiliza capital, mas entra no valor de estoque.
    const consignado = await createWatch(ctx.db, ownerId, {
      tipo: "CONSIGNED",
      valorAnunciado: 8000,
    });
    const supplierId = await createSupplier(ctx.db, ownerId);
    await createConsignment(ctx.db, ownerId, consignado.id, supplierId, {
      modalidade: "FIXED_PAYOUT",
      valorRepasseFixo: 6000,
    });

    const row = await summary();

    expect(Number(row.capital_investido)).toBe(3200);
    expect(Number(row.valor_estoque)).toBe(13000);
  });

  it("calcula lucro potencial e lucro minimo dos proprios", async () => {
    const row = await summary();

    // 5000 - 3000 - 200 = 1800 ; 4500 - 3000 - 200 = 1300
    expect(Number(row.lucro_potencial_proprio)).toBe(1800);
    expect(Number(row.lucro_minimo_proprio)).toBe(1300);
  });

  it("conta os relogios por status", async () => {
    const row = await summary();

    expect(Number(row.total_disponivel)).toBe(2);
    expect(Number(row.total_reservado)).toBe(0);
    expect(Number(row.total_vendido)).toBe(0);
  });

  describe("caixa", () => {
    it("soma entradas confirmadas e subtrai saidas confirmadas", async () => {
      await ctx.db.query(
        `insert into public.financial_transactions (owner_id, direcao, categoria, valor, status)
         values ($1, 'INCOME', 'SALE', 5000, 'CONFIRMED')`,
        [ownerId],
      );
      await ctx.db.query(
        `insert into public.financial_transactions (owner_id, direcao, categoria, valor, status)
         values ($1, 'EXPENSE', 'META_ADS', 500, 'CONFIRMED')`,
        [ownerId],
      );

      expect(Number((await summary()).caixa)).toBe(14500);
    });

    it("ignora lancamento pendente e estornado", async () => {
      await ctx.db.query(
        `insert into public.financial_transactions (owner_id, direcao, categoria, valor, status)
         values ($1, 'INCOME', 'SALE', 9999, 'PENDING')`,
        [ownerId],
      );
      await ctx.db.query(
        `insert into public.financial_transactions (owner_id, direcao, categoria, valor, status)
         values ($1, 'EXPENSE', 'SHIPPING', 7777, 'REVERSED')`,
        [ownerId],
      );

      expect(Number((await summary()).caixa)).toBe(14500);
    });
  });

  describe("repasse ao consignante", () => {
    it("repasse pendente nao reduz o caixa e aparece como alerta", async () => {
      // Cenario critico da Secao 19.1.
      const caixaAntes = Number((await summary()).caixa);

      const clientId = await createClient(ctx.db, ownerId);
      const supplierId = await createSupplier(ctx.db, ownerId, "Consignante");
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      const consignmentId = await createConsignment(
        ctx.db,
        ownerId,
        watch.id,
        supplierId,
        { modalidade: "FIXED_PAYOUT", valorRepasseFixo: 4000 },
      );
      const saleId = await createSale(
        ctx.db,
        ownerId,
        watch.id,
        clientId,
        5000,
      );

      await ctx.db.query(
        `insert into public.consignment_payouts
           (owner_id, consignment_id, sale_id, supplier_id, valor, status)
         values ($1, $2, $3, $4, 4000, 'PENDING')`,
        [ownerId, consignmentId, saleId, supplierId],
      );

      const row = await summary();

      expect(Number(row.caixa)).toBe(caixaAntes);
      expect(Number(row.repasses_pendentes)).toBe(1);

      const alerts = await ctx.db.query<{ tipo: string }>(
        "select tipo from public.active_alerts where owner_id = $1 and tipo = 'PAYOUT_PENDING'",
        [ownerId],
      );
      expect(alerts.rows).toHaveLength(1);
    });

    it("repasse pago reduz o caixa uma unica vez", async () => {
      const caixaAntes = Number((await summary()).caixa);

      const payout = await ctx.db.query<{ id: string }>(
        "select id from public.consignment_payouts where owner_id = $1 limit 1",
        [ownerId],
      );

      await ctx.db.query(
        `update public.consignment_payouts
         set status = 'PAID', data_pagamento = current_date where id = $1`,
        [payout.rows[0].id],
      );

      await ctx.db.query(
        `insert into public.financial_transactions
           (owner_id, direcao, categoria, valor, status, payout_id, idempotency_key)
         values ($1, 'EXPENSE', 'PAYOUT', 4000, 'CONFIRMED', $2, $3)`,
        [ownerId, payout.rows[0].id, `payout-${payout.rows[0].id}`],
      );

      const row = await summary();

      expect(Number(row.caixa)).toBe(caixaAntes - 4000);
      expect(Number(row.repasses_pendentes)).toBe(0);

      // A chave de idempotencia impede um segundo debito do mesmo repasse.
      await expect(
        ctx.db.query(
          `insert into public.financial_transactions
             (owner_id, direcao, categoria, valor, status, payout_id, idempotency_key)
           values ($1, 'EXPENSE', 'PAYOUT', 4000, 'CONFIRMED', $2, $3)`,
          [ownerId, payout.rows[0].id, `payout-${payout.rows[0].id}`],
        ),
      ).rejects.toThrow(/financial_idempotency_unica/);
    });
  });

  describe("stock_aging", () => {
    it("marca como parado o item acima do limite configurado", async () => {
      const antigo = await createWatch(ctx.db, ownerId, {
        diasEmEstoque: 120,
      });
      const recente = await createWatch(ctx.db, ownerId);

      const result = await ctx.db.query<{
        watch_id: string;
        dias_em_estoque: number;
        parado: boolean;
      }>(
        `select watch_id, dias_em_estoque, parado from public.stock_aging
         where owner_id = $1 and watch_id = any($2::uuid[])`,
        [ownerId, [antigo.id, recente.id]],
      );

      const porId = new Map(result.rows.map((row) => [row.watch_id, row]));

      expect(porId.get(antigo.id)?.dias_em_estoque).toBe(120);
      expect(porId.get(antigo.id)?.parado).toBe(true);
      expect(porId.get(recente.id)?.parado).toBe(false);
    });
  });

  describe("customer_credit_balances", () => {
    it("apura o saldo liquido de creditos e debitos", async () => {
      const clientId = await createClient(ctx.db, ownerId, "Cliente Credito");

      await ctx.db.query(
        `insert into public.customer_credit_movements (owner_id, client_id, tipo, valor, motivo)
         values ($1, $2, 'CREDIT', 800, 'sinal convertido em credito')`,
        [ownerId, clientId],
      );
      await ctx.db.query(
        `insert into public.customer_credit_movements (owner_id, client_id, tipo, valor, motivo)
         values ($1, $2, 'DEBIT', 300, 'abatido na compra')`,
        [ownerId, clientId],
      );

      const result = await ctx.db.query<{ saldo: string }>(
        "select saldo from public.customer_credit_balances where client_id = $1",
        [clientId],
      );

      expect(Number(result.rows[0].saldo)).toBe(500);
    });
  });

  describe("monthly_sales_profit e sales_by_origin", () => {
    it("agrupa vendas por mes e por canal", async () => {
      const porMes = await ctx.db.query<{
        quantidade: string;
        receita: string;
      }>("select quantidade, receita from public.monthly_sales_profit where owner_id = $1", [
        ownerId,
      ]);

      expect(porMes.rows.length).toBeGreaterThan(0);

      const porOrigem = await ctx.db.query<{
        origem: string;
        quantidade: number;
        valor: string;
      }>("select origem, quantidade, valor from public.sales_by_origin where owner_id = $1", [
        ownerId,
      ]);

      expect(porOrigem.rows).toEqual([
        { origem: "Instagram", quantidade: 1, valor: "5000.00" },
      ]);
    });
  });
});
