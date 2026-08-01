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
 * Concluir venda e pagar consignante (Secoes 13.4 e 13.5).
 *
 * Cenarios criticos da Secao 19.1: "Sinal nao e contabilizado novamente na
 * conclusao da venda" e "Repasse pendente nao reduz o caixa; pago reduz uma
 * unica vez".
 */
describe("vendas", () => {
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

  async function vender(
    watchId: string,
    valor: number,
    cliente = clientId,
    userId = owner,
  ) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{
        sale_id: string;
        lucro_bruto: string;
        lucro_liquido: string;
        entrada_caixa: string;
        sinal_aproveitado: string;
        payout_id: string | null;
      }>(
        `select * from public.complete_sale(
           p_watch_id => $1,
           p_client_id => $2,
           p_valor_venda => $3,
           p_origem => 'Instagram'
         )`,
        [watchId, cliente, valor],
      ),
    );
  }

  async function reservar(watchId: string, combinado: number, sinal: number) {
    const result = await ctx.asUser(owner, () =>
      ctx.db.query<{ reservation_id: string }>(
        `select * from public.create_reservation(
           p_watch_id => $1, p_client_id => $2, p_valor_combinado => $3,
           p_validade => current_date + 7, p_valor_sinal => $4
         )`,
        [watchId, clientId, combinado, sinal],
      ),
    );

    return result.rows[0].reservation_id;
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

  describe("venda propria sem reserva", () => {
    it("registra a venda e o lucro", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 3000 });
      const result = await vender(watch.id, 5000);

      expect(Number(result.rows[0].lucro_bruto)).toBe(2000);
      expect(Number(result.rows[0].lucro_liquido)).toBe(2000);
      expect(Number(result.rows[0].entrada_caixa)).toBe(5000);
      expect(Number(result.rows[0].sinal_aproveitado)).toBe(0);
      expect(result.rows[0].payout_id).toBeNull();
    });

    it("marca o relogio como vendido preservando o registro", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      await vender(watch.id, 2000);

      const row = await ctx.db.query<{
        status: string;
        valor_vendido: string;
        deleted_at: string | null;
      }>(
        "select status, valor_vendido, deleted_at from public.watches where id = $1",
        [watch.id],
      );

      expect(row.rows[0].status).toBe("SOLD");
      expect(Number(row.rows[0].valor_vendido)).toBe(2000);
      // Venda nao apaga o relogio (Secao 10.4).
      expect(row.rows[0].deleted_at).toBeNull();
    });

    it("credita o caixa com o valor integral", async () => {
      const antes = await caixa();
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

      await vender(watch.id, 2500);

      expect(await caixa()).toBe(antes + 2500);
    });

    it("desconta despesas vinculadas do lucro liquido", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 2000 });
      await createExpense(ctx.db, owner, {
        watchId: watch.id,
        categoria: "SERVICE",
        valor: 300,
      });

      const result = await vender(watch.id, 4000);

      expect(Number(result.rows[0].lucro_bruto)).toBe(2000);
      expect(Number(result.rows[0].lucro_liquido)).toBe(1700);
    });
  });

  describe("venda de item reservado", () => {
    it("nao contabiliza o sinal outra vez", async () => {
      // Cenario critico da Secao 19.1.
      const watch = await createWatch(ctx.db, owner, { valorCompra: 2000 });
      const antes = await caixa();

      await reservar(watch.id, 5000, 1500);
      expect(await caixa()).toBe(antes + 1500);

      const result = await vender(watch.id, 5000);

      // So os 3500 restantes entram agora.
      expect(Number(result.rows[0].entrada_caixa)).toBe(3500);
      expect(Number(result.rows[0].sinal_aproveitado)).toBe(1500);

      // Total no caixa: 1500 do sinal + 3500 do restante = 5000.
      expect(await caixa()).toBe(antes + 5000);
    });

    it("conclui a reserva associada", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const reservationId = await reservar(watch.id, 3000, 500);

      await vender(watch.id, 3000);

      const reserva = await ctx.db.query<{ status: string }>(
        "select status from public.reservations where id = $1",
        [reservationId],
      );

      expect(reserva.rows[0].status).toBe("COMPLETED");
    });

    it("liga a venda a reserva de origem", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      const reservationId = await reservar(watch.id, 3000, 500);
      const { sale_id } = (await vender(watch.id, 3000)).rows[0];

      const venda = await ctx.db.query<{ reservation_id: string }>(
        "select reservation_id from public.sales where id = $1",
        [sale_id],
      );

      expect(venda.rows[0].reservation_id).toBe(reservationId);
    });

    it("recusa vender para cliente diferente do da reserva", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      await reservar(watch.id, 3000, 500);

      await expect(vender(watch.id, 3000, outroClientId)).rejects.toThrow(
        /reservado para outro cliente/i,
      );
    });

    it("recusa valor de venda menor que o sinal recebido", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      await reservar(watch.id, 3000, 1000);

      await expect(vender(watch.id, 800)).rejects.toThrow(
        /menor que o sinal/i,
      );
    });

    it("nao lanca entrada quando o sinal cobriu o valor total", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 500 });
      await reservar(watch.id, 1200, 1200);

      const antes = await caixa();
      const result = await vender(watch.id, 1200);

      expect(Number(result.rows[0].entrada_caixa)).toBe(0);
      expect(await caixa()).toBe(antes);
    });
  });

  describe("venda consignada", () => {
    it("cria o repasse pendente sem reduzir o caixa", async () => {
      // Cenario critico da Secao 19.1.
      const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, owner, watch.id, supplierId, {
        modalidade: "WATA_PERCENTAGE",
        percentualWata: 20,
      });

      const antes = await caixa();
      const result = await vender(watch.id, 5000);

      expect(result.rows[0].payout_id).not.toBeNull();
      expect(Number(result.rows[0].lucro_bruto)).toBe(1000);

      // Entrou a venda inteira; o repasse ainda nao saiu.
      expect(await caixa()).toBe(antes + 5000);

      const payout = await ctx.db.query<{ status: string; valor: string }>(
        "select status, valor from public.consignment_payouts where sale_id = $1",
        [result.rows[0].sale_id],
      );

      expect(payout.rows[0].status).toBe("PENDING");
      expect(Number(payout.rows[0].valor)).toBe(4000);
    });

    it("encerra a consignacao junto com a venda", async () => {
      const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });
      const consignmentId = await createConsignment(
        ctx.db,
        owner,
        watch.id,
        supplierId,
        { modalidade: "FIXED_PAYOUT", valorRepasseFixo: 3000 },
      );

      await vender(watch.id, 4000);

      const consignacao = await ctx.db.query<{ encerrado_em: string | null }>(
        "select encerrado_em from public.consignments where id = $1",
        [consignmentId],
      );

      expect(consignacao.rows[0].encerrado_em).not.toBeNull();
    });

    it("calcula o repasse fixo corretamente", async () => {
      const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, owner, watch.id, supplierId, {
        modalidade: "FIXED_PAYOUT",
        valorRepasseFixo: 3000,
      });

      const result = await vender(watch.id, 4200);

      expect(Number(result.rows[0].lucro_bruto)).toBe(1200);

      const payout = await ctx.db.query<{ valor: string }>(
        "select valor from public.consignment_payouts where sale_id = $1",
        [result.rows[0].sale_id],
      );
      expect(Number(payout.rows[0].valor)).toBe(3000);
    });
  });

  describe("pagar consignante", () => {
    async function venderConsignado() {
      const watch = await createWatch(ctx.db, owner, { tipo: "CONSIGNED" });
      await createConsignment(ctx.db, owner, watch.id, supplierId, {
        modalidade: "FIXED_PAYOUT",
        valorRepasseFixo: 2000,
      });

      const result = await vender(watch.id, 3000);

      return result.rows[0].payout_id!;
    }

    async function pagar(payoutId: string, userId = owner) {
      return ctx.asUser(userId, () =>
        ctx.db.query(
          `select * from public.pay_consignment_payout(
             p_payout_id => $1, p_forma_pagamento => 'PIX'
           )`,
          [payoutId],
        ),
      );
    }

    it("reduz o caixa uma unica vez", async () => {
      const payoutId = await venderConsignado();
      const antes = await caixa();

      await pagar(payoutId);

      expect(await caixa()).toBe(antes - 2000);

      const payout = await ctx.db.query<{
        status: string;
        data_pagamento: string | null;
      }>(
        "select status, data_pagamento from public.consignment_payouts where id = $1",
        [payoutId],
      );

      expect(payout.rows[0].status).toBe("PAID");
      expect(payout.rows[0].data_pagamento).not.toBeNull();
    });

    it("recusa pagar o mesmo repasse duas vezes", async () => {
      const payoutId = await venderConsignado();
      await pagar(payoutId);

      await expect(pagar(payoutId)).rejects.toThrow(/ja foi encerrado/i);
    });

    it("nao paga repasse de outro usuario", async () => {
      const payoutId = await venderConsignado();

      await expect(pagar(payoutId, outro)).rejects.toThrow(/nao encontrado/i);
    });
  });

  describe("integridade", () => {
    it("recusa vender o mesmo relogio duas vezes", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      await vender(watch.id, 2000);

      await expect(vender(watch.id, 2200)).rejects.toThrow(
        /nao pode ser vendido/i,
      );
    });

    it("nao deixa registro parcial quando a venda falha", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

      const vendasAntes = await ctx.db.query<{ total: number }>(
        "select count(*)::int as total from public.sales",
      );

      await expect(vender(watch.id, -50)).rejects.toThrow(/valor da venda/i);

      const vendasDepois = await ctx.db.query<{ total: number }>(
        "select count(*)::int as total from public.sales",
      );

      expect(vendasDepois.rows[0].total).toBe(vendasAntes.rows[0].total);

      const row = await ctx.db.query<{ status: string }>(
        "select status from public.watches where id = $1",
        [watch.id],
      );
      expect(row.rows[0].status).toBe("AVAILABLE");
    });

    it("nao vende relogio de outro usuario", async () => {
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

      await expect(vender(watch.id, 2000, clientId, outro)).rejects.toThrow(
        /nao encontrado/i,
      );

      const row = await ctx.db.query<{ status: string }>(
        "select status from public.watches where id = $1",
        [watch.id],
      );
      expect(row.rows[0].status).toBe("AVAILABLE");
    });

    it("soma o lucro realizado no dashboard", async () => {
      const antes = await ctx.db.query<{ lucro_realizado: string }>(
        "select lucro_realizado from public.dashboard_summary where owner_id = $1",
        [owner],
      );

      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });
      await vender(watch.id, 2500);

      const depois = await ctx.db.query<{ lucro_realizado: string }>(
        "select lucro_realizado from public.dashboard_summary where owner_id = $1",
        [owner],
      );

      expect(Number(depois.rows[0].lucro_realizado)).toBe(
        Number(antes.rows[0].lucro_realizado) + 1500,
      );
    });
  });
});
