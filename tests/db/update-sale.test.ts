// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import {
  createClient,
  createConsignment,
  createExpense,
  createSupplier,
  createWatch,
} from "./helpers/fixtures";

/**
 * Editar uma venda concluida (update_sale).
 *
 * O ponto do teste e o recalculo em cascata: lucro, valor vendido do relogio,
 * entrada no caixa e repasse ao consignante.
 */
describe("update_sale", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;
  let clientId: string;
  let outroClientId: string;
  let supplierId: string;

  async function caixa() {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    return Number(result.rows[0].caixa);
  }

  async function vender(watchId: string, valor: number, cliente = clientId) {
    const result = await ctx.asUser(owner, () =>
      ctx.db.query<{ sale_id: string }>(
        `select * from public.complete_sale(
           p_watch_id => $1, p_client_id => $2, p_valor_venda => $3,
           p_origem => 'Instagram'
         )`,
        [watchId, cliente, valor],
      ),
    );

    return result.rows[0].sale_id;
  }

  async function editar(
    saleId: string,
    valor: number,
    extras: { origem?: string; clientId?: string } = {},
    userId = owner,
  ) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{
        lucro_bruto: string;
        lucro_liquido: string;
        entrada_caixa: string;
        repasse_ajustado: string | null;
      }>(
        `select * from public.update_sale(
           p_sale_id => $1,
           p_valor_venda => $2,
           p_origem => $3,
           p_client_id => $4
         )`,
        [saleId, valor, extras.origem ?? null, extras.clientId ?? null],
      ),
    );
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");
    clientId = await createClient(ctx.db, owner, "Ana");
    outroClientId = await createClient(ctx.db, owner, "Bruno");
    supplierId = await createSupplier(ctx.db, owner);

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 50000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe("venda propria", () => {
    it("recalcula o lucro quando o valor muda", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 2000 });
      const saleId = await vender(watch.id, 3000);

      const result = await editar(saleId, 3500);

      expect(Number(result.rows[0].lucro_bruto)).toBe(1500);
      expect(Number(result.rows[0].lucro_liquido)).toBe(1500);
    });

    it("ajusta o caixa pela diferenca", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      const antes = await caixa();
      await editar(saleId, 2600);

      // Nao soma 2600 de novo: a entrada existente passa a valer 2600.
      expect(await caixa()).toBe(antes + 600);

      const lancamentos = await ctx.db.query<{ valor: string }>(
        "select valor from public.financial_transactions where sale_id = $1 and categoria = 'SALE'",
        [saleId],
      );
      expect(lancamentos.rows).toHaveLength(1);
      expect(Number(lancamentos.rows[0].valor)).toBe(2600);
    });

    it("atualiza o valor vendido do relogio", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await editar(saleId, 2400);

      const row = await ctx.db.query<{ valor_vendido: string }>(
        "select valor_vendido from public.watches where id = $1",
        [watch.id],
      );
      expect(Number(row.rows[0].valor_vendido)).toBe(2400);
    });

    it("mantem as despesas vinculadas no lucro liquido", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);
      await createExpense(ctx.db, owner, {
        watchId: watch.id,
        categoria: "SHIPPING",
        valor: 150,
      });

      const result = await editar(saleId, 2500);

      expect(Number(result.rows[0].lucro_bruto)).toBe(1500);
      expect(Number(result.rows[0].lucro_liquido)).toBe(1350);
    });

    it("registra a alteracao de valor no historico", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await editar(saleId, 2200);

      const historico = await ctx.db.query<{ motivo: string }>(
        `select motivo from public.watch_status_history
         where watch_id = $1 and motivo like 'Valor da venda alterado%'`,
        [watch.id],
      );

      expect(historico.rows).toHaveLength(1);
      expect(historico.rows[0].motivo).toContain("2.000,00");
      expect(historico.rows[0].motivo).toContain("2.200,00");
    });

    it("permite corrigir o cliente quando nao veio de reserva", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await editar(saleId, 2000, { clientId: outroClientId });

      const row = await ctx.db.query<{ client_id: string }>(
        "select client_id from public.sales where id = $1",
        [saleId],
      );
      expect(row.rows[0].client_id).toBe(outroClientId);
    });

    it("atualiza a origem sem mexer nos valores", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);
      const antes = await caixa();

      await editar(saleId, 2000, { origem: "WhatsApp" });

      expect(await caixa()).toBe(antes);

      const row = await ctx.db.query<{ origem: string }>(
        "select origem from public.sales where id = $1",
        [saleId],
      );
      expect(row.rows[0].origem).toBe("WhatsApp");
    });
  });

  describe("venda com sinal de reserva", () => {
    async function venderComReserva(sinal: number, combinado: number) {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

      await ctx.asUser(owner, () =>
        ctx.db.query(
          `select * from public.create_reservation(
             p_watch_id => $1, p_client_id => $2, p_valor_combinado => $3,
             p_validade => current_date + 7, p_valor_sinal => $4
           )`,
          [watch.id, clientId, combinado, sinal],
        ),
      );

      return { watch, saleId: await vender(watch.id, combinado) };
    }

    it("nao cobra o sinal de novo ao alterar o valor", async () => {
      const { saleId } = await venderComReserva(1000, 3000);

      const antes = await caixa();
      await editar(saleId, 3500);

      // A entrada vai de 2000 para 2500: diferenca de 500, nao 3500.
      expect(await caixa()).toBe(antes + 500);

      const lancamento = await ctx.db.query<{ valor: string }>(
        "select valor from public.financial_transactions where sale_id = $1 and categoria = 'SALE'",
        [saleId],
      );
      expect(Number(lancamento.rows[0].valor)).toBe(2500);
    });

    it("cancela a entrada quando o sinal passa a cobrir tudo", async () => {
      const { saleId } = await venderComReserva(1500, 3000);

      const antes = await caixa();
      await editar(saleId, 1500);

      // Devolve os 1500 que tinham entrado como restante.
      expect(await caixa()).toBe(antes - 1500);

      const lancamento = await ctx.db.query<{
        status: string;
        valor: string;
      }>(
        "select status, valor from public.financial_transactions where sale_id = $1 and categoria = 'SALE'",
        [saleId],
      );

      // Historico preservado: cancelado, nao apagado.
      expect(lancamento.rows[0].status).toBe("CANCELLED");
      expect(Number(lancamento.rows[0].valor)).toBe(0);
    });

    it("recusa valor menor que o sinal recebido", async () => {
      const { saleId } = await venderComReserva(1200, 3000);

      await expect(editar(saleId, 800)).rejects.toThrow(/menor que o sinal/i);
    });

    it("recusa trocar o cliente da venda originada de reserva", async () => {
      const { saleId } = await venderComReserva(500, 3000);

      await expect(
        editar(saleId, 3000, { clientId: outroClientId }),
      ).rejects.toThrow(/nao pode ser trocado/i);
    });
  });

  describe("venda consignada", () => {
    async function venderConsignado(
      percentual: number | null,
      fixo: number | null,
      valor: number,
    ) {
      const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });

      await createConsignment(
        ctx.db,
        owner,
        watch.id,
        supplierId,
        percentual !== null
          ? { modalidade: "WATA_PERCENTAGE", percentualWata: percentual }
          : { modalidade: "FIXED_PAYOUT", valorRepasseFixo: fixo! },
      );

      return vender(watch.id, valor);
    }

    it("recalcula o repasse pendente quando o valor muda", async () => {
      const saleId = await venderConsignado(20, null, 5000);

      const result = await editar(saleId, 6000);

      // 20% de 6000 = 1200 de comissao; repasse = 4800.
      expect(Number(result.rows[0].lucro_bruto)).toBe(1200);
      expect(Number(result.rows[0].repasse_ajustado)).toBe(4800);

      const payout = await ctx.db.query<{ valor: string }>(
        "select valor from public.consignment_payouts where sale_id = $1",
        [saleId],
      );
      expect(Number(payout.rows[0].valor)).toBe(4800);
    });

    it("nao mexe no repasse fixo, que independe do valor da venda", async () => {
      const saleId = await venderConsignado(null, 3000, 4000);

      await editar(saleId, 4500);

      const payout = await ctx.db.query<{ valor: string }>(
        "select valor from public.consignment_payouts where sale_id = $1",
        [saleId],
      );
      expect(Number(payout.rows[0].valor)).toBe(3000);
    });

    it("bloqueia alterar o valor com repasse percentual ja pago", async () => {
      /*
       * O dinheiro do consignante ja saiu calculado sobre o valor antigo.
       * Alterar a venda faria o caixa contar uma historia que nao aconteceu.
       */
      const saleId = await venderConsignado(20, null, 5000);

      const payout = await ctx.db.query<{ id: string }>(
        "select id from public.consignment_payouts where sale_id = $1",
        [saleId],
      );

      await ctx.asUser(owner, () =>
        ctx.db.query(
          "select * from public.pay_consignment_payout(p_payout_id => $1)",
          [payout.rows[0].id],
        ),
      );

      await expect(editar(saleId, 6000)).rejects.toThrow(
        /repasse deste item ja foi pago/i,
      );
    });

    it("permite editar dados nao financeiros mesmo com repasse pago", async () => {
      const saleId = await venderConsignado(20, null, 5000);

      const payout = await ctx.db.query<{ id: string }>(
        "select id from public.consignment_payouts where sale_id = $1",
        [saleId],
      );
      await ctx.asUser(owner, () =>
        ctx.db.query(
          "select * from public.pay_consignment_payout(p_payout_id => $1)",
          [payout.rows[0].id],
        ),
      );

      // Mesmo valor: so a origem muda.
      await expect(
        editar(saleId, 5000, { origem: "OLX" }),
      ).resolves.toBeDefined();
    });

    it("permite alterar valor com repasse fixo ja pago", async () => {
      const saleId = await venderConsignado(null, 2000, 3000);

      const payout = await ctx.db.query<{ id: string }>(
        "select id from public.consignment_payouts where sale_id = $1",
        [saleId],
      );
      await ctx.asUser(owner, () =>
        ctx.db.query(
          "select * from public.pay_consignment_payout(p_payout_id => $1)",
          [payout.rows[0].id],
        ),
      );

      // O repasse fixo nao depende do valor da venda: so o lucro da WATA muda.
      const result = await editar(saleId, 3600);
      expect(Number(result.rows[0].lucro_bruto)).toBe(1600);
    });
  });

  describe("integridade", () => {
    it("recusa valor negativo", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await expect(editar(saleId, -10)).rejects.toThrow(/valor da venda/i);
    });

    it("nao edita venda de outro usuario", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await expect(
        editar(saleId, 2500, {}, outro),
      ).rejects.toThrow(/nao encontrada/i);

      const row = await ctx.db.query<{ valor_venda: string }>(
        "select valor_venda from public.sales where id = $1",
        [saleId],
      );
      expect(Number(row.rows[0].valor_venda)).toBe(2000);
    });

    it("nao deixa alteracao parcial quando a operacao falha", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      await expect(editar(saleId, -1)).rejects.toThrow();

      const venda = await ctx.db.query<{ valor_venda: string }>(
        "select valor_venda from public.sales where id = $1",
        [saleId],
      );
      const relogio = await ctx.db.query<{ valor_vendido: string }>(
        "select valor_vendido from public.watches where id = $1",
        [watch.id],
      );

      expect(Number(venda.rows[0].valor_venda)).toBe(2000);
      expect(Number(relogio.rows[0].valor_vendido)).toBe(2000);
    });

    it("mantem o lucro realizado do dashboard coerente", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const saleId = await vender(watch.id, 2000);

      const antes = await ctx.db.query<{ lucro_realizado: string }>(
        "select lucro_realizado from public.dashboard_summary where owner_id = $1",
        [owner],
      );

      await editar(saleId, 2300);

      const depois = await ctx.db.query<{ lucro_realizado: string }>(
        "select lucro_realizado from public.dashboard_summary where owner_id = $1",
        [owner],
      );

      expect(Number(depois.rows[0].lucro_realizado)).toBe(
        Number(antes.rows[0].lucro_realizado) + 300,
      );
    });
  });
});
