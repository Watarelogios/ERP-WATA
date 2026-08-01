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
  saleProfit,
} from "./helpers/fixtures";

/**
 * Formulas da Secao 12.
 *
 * Cenario critico da Secao 19.1: "Lucros dos tres modelos conferem com os
 * valores esperados".
 */
describe("lucro", () => {
  let ctx: TestDatabase;
  let ownerId: string;
  let clientId: string;
  let supplierId: string;

  beforeAll(async () => {
    ctx = await createTestDatabase();
    ownerId = await ctx.createUser("dono@wata.test");
    clientId = await createClient(ctx.db, ownerId);
    supplierId = await createSupplier(ctx.db, ownerId);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe("venda propria (Secao 12.1)", () => {
    it("lucro bruto = valor_venda - valor_compra", async () => {
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 3000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      const { bruto, liquido } = await saleProfit(ctx.db, saleId);

      expect(bruto).toBe(2000);
      expect(liquido).toBe(2000);
    });

    it("lucro liquido desconta despesas vinculadas", async () => {
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 3000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      await createExpense(ctx.db, ownerId, {
        watchId: watch.id,
        categoria: "SHIPPING",
        valor: 150,
      });
      await createExpense(ctx.db, ownerId, {
        saleId,
        categoria: "STRAP",
        valor: 250,
      });

      const { bruto, liquido } = await saleProfit(ctx.db, saleId);

      expect(bruto).toBe(2000);
      expect(liquido).toBe(1600);
    });

    it("nao subtrai a despesa de compra duas vezes", async () => {
      /*
       * Confirmar a compra cria uma despesa PURCHASE (Secao 13.1) e o custo ja
       * esta em valor_compra. Contar as duas coisas subtrairia a compra duas
       * vezes e mostraria lucro menor do que o real.
       */
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 3000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      await createExpense(ctx.db, ownerId, {
        watchId: watch.id,
        categoria: "PURCHASE",
        valor: 3000,
      });

      const { liquido } = await saleProfit(ctx.db, saleId);

      expect(liquido).toBe(2000);
    });

    it("ignora despesa estornada", async () => {
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 1000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 2000);

      await createExpense(ctx.db, ownerId, {
        watchId: watch.id,
        valor: 300,
        status: "REVERSED",
      });

      const { liquido } = await saleProfit(ctx.db, saleId);

      expect(liquido).toBe(1000);
    });

    it("nao considera despesa generica sem vinculo", async () => {
      // Meta Ads afeta o caixa, mas so reduz o lucro do item se vinculada.
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 1000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 2000);

      await createExpense(ctx.db, ownerId, {
        categoria: "META_ADS",
        valor: 500,
      });

      const { liquido } = await saleProfit(ctx.db, saleId);

      expect(liquido).toBe(1000);
    });
  });

  describe("consignacao com repasse fixo (Secao 12.2)", () => {
    it("lucro = valor_venda - valor_repasse_fixo - despesas", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "FIXED_PAYOUT",
        valorRepasseFixo: 4000,
      });

      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);
      await createExpense(ctx.db, ownerId, {
        watchId: watch.id,
        categoria: "PACKAGING",
        valor: 100,
      });

      const { bruto, liquido } = await saleProfit(ctx.db, saleId);

      expect(bruto).toBe(1000);
      expect(liquido).toBe(900);
    });

    it("calcula o valor devido ao consignante", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "FIXED_PAYOUT",
        valorRepasseFixo: 4000,
      });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      const result = await ctx.db.query<{ valor: string }>(
        "select public.consignment_payout_amount($1) as valor",
        [saleId],
      );

      expect(Number(result.rows[0].valor)).toBe(4000);
    });
  });

  describe("consignacao com comissao percentual (Secao 12.3)", () => {
    it("comissao = valor_venda * percentual / 100", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "WATA_PERCENTAGE",
        percentualWata: 20,
      });

      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      const { bruto, liquido } = await saleProfit(ctx.db, saleId);

      expect(bruto).toBe(1000);
      expect(liquido).toBe(1000);
    });

    it("repasse = valor_venda - comissao", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "WATA_PERCENTAGE",
        percentualWata: 20,
      });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      const result = await ctx.db.query<{ valor: string }>(
        "select public.consignment_payout_amount($1) as valor",
        [saleId],
      );

      expect(Number(result.rows[0].valor)).toBe(4000);
    });

    it("desconta as despesas da WATA da comissao", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "WATA_PERCENTAGE",
        percentualWata: 20,
      });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      await createExpense(ctx.db, ownerId, {
        saleId,
        categoria: "SHIPPING",
        valor: 120,
      });

      const { liquido } = await saleProfit(ctx.db, saleId);

      expect(liquido).toBe(880);
    });

    it("nao conta o repasse pago como despesa que reduz o lucro", async () => {
      /*
       * O repasse ja esta embutido no lucro bruto da consignacao. Registra-lo
       * tambem como despesa vinculada reduziria o lucro duas vezes.
       */
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, ownerId, watch.id, supplierId, {
        modalidade: "WATA_PERCENTAGE",
        percentualWata: 20,
      });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 5000);

      await createExpense(ctx.db, ownerId, {
        saleId,
        categoria: "PAYOUT",
        valor: 4000,
      });

      const { liquido } = await saleProfit(ctx.db, saleId);

      expect(liquido).toBe(1000);
    });
  });

  describe("recalculo", () => {
    it("atualiza o lucro quando uma despesa e removida", async () => {
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 1000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 2000);

      const expenseId = await createExpense(ctx.db, ownerId, {
        watchId: watch.id,
        valor: 200,
      });

      expect((await saleProfit(ctx.db, saleId)).liquido).toBe(800);

      await ctx.db.query("delete from public.expenses where id = $1", [
        expenseId,
      ]);

      expect((await saleProfit(ctx.db, saleId)).liquido).toBe(1000);
    });

    it("atualiza o lucro quando o valor da venda muda", async () => {
      const watch = await createWatch(ctx.db, ownerId, { valorCompra: 1000 });
      const saleId = await createSale(ctx.db, ownerId, watch.id, clientId, 2000);

      await ctx.db.query(
        "update public.sales set valor_venda = $1 where id = $2",
        [2500, saleId],
      );

      expect((await saleProfit(ctx.db, saleId)).liquido).toBe(1500);
    });
  });
});
