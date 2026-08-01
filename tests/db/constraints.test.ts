// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import {
  createClient,
  createSale,
  createSupplier,
  createWatch,
} from "./helpers/fixtures";

/**
 * Constraints e regras de concorrencia (Secao 8 e 18).
 *
 * O que protege a integridade financeira e o banco, nao a interface: estes
 * testes atacam as tabelas diretamente, ignorando qualquer validacao de tela.
 */
describe("constraints", () => {
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

  describe("valores monetarios", () => {
    it("rejeita valor de compra negativo", async () => {
      await expect(
        ctx.db.query(
          `insert into public.watches (owner_id, marca, modelo, tipo, valor_compra)
           values ($1, 'Seiko', 'SKX', 'OWNED', -1)`,
          [ownerId],
        ),
      ).rejects.toThrow(/nao_negativo/);
    });

    it("rejeita valor de venda negativo", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      await expect(
        ctx.db.query(
          `insert into public.sales (owner_id, watch_id, client_id, valor_venda)
           values ($1, $2, $3, -100)`,
          [ownerId, watch.id, clientId],
        ),
      ).rejects.toThrow(/nao_negativo/);
    });

    it("rejeita percentual fora de 0 a 100", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });

      await expect(
        ctx.db.query(
          `insert into public.consignments
             (owner_id, watch_id, supplier_id, modalidade, percentual_wata)
           values ($1, $2, $3, 'WATA_PERCENTAGE', 120)`,
          [ownerId, watch.id, supplierId],
        ),
      ).rejects.toThrow(/percentual_valido/);
    });
  });

  describe("coerencia do relogio", () => {
    it("exige valor de compra em item proprio", async () => {
      await expect(
        ctx.db.query(
          `insert into public.watches (owner_id, marca, modelo, tipo)
           values ($1, 'Seiko', 'SKX', 'OWNED')`,
          [ownerId],
        ),
      ).rejects.toThrow(/custo_conforme_tipo/);
    });

    it("proibe valor de compra em item consignado", async () => {
      await expect(
        ctx.db.query(
          `insert into public.watches (owner_id, marca, modelo, tipo, valor_compra)
           values ($1, 'Rolex', 'Datejust', 'CONSIGNED', 5000)`,
          [ownerId],
        ),
      ).rejects.toThrow(/custo_conforme_tipo/);
    });

    it("so aceita valor vendido depois da venda concluida", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      await expect(
        ctx.db.query(
          "update public.watches set valor_vendido = 3000 where id = $1",
          [watch.id],
        ),
      ).rejects.toThrow(/valor_vendido_apenas_se_vendido/);

      await ctx.db.query(
        "update public.watches set status = 'SOLD', valor_vendido = 3000 where id = $1",
        [watch.id],
      );

      const result = await ctx.db.query<{ valor_vendido: string }>(
        "select valor_vendido from public.watches where id = $1",
        [watch.id],
      );

      expect(Number(result.rows[0].valor_vendido)).toBe(3000);
    });
  });

  describe("consignacao", () => {
    it("exige exatamente um valor por modalidade", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });

      await expect(
        ctx.db.query(
          `insert into public.consignments
             (owner_id, watch_id, supplier_id, modalidade, valor_repasse_fixo, percentual_wata)
           values ($1, $2, $3, 'FIXED_PAYOUT', 1000, 20)`,
          [ownerId, watch.id, supplierId],
        ),
      ).rejects.toThrow(/valor_conforme_modalidade/);
    });

    it("permite apenas uma consignacao vigente por relogio", async () => {
      const watch = await createWatch(ctx.db, ownerId, { tipo: "CONSIGNED" });

      await ctx.db.query(
        `insert into public.consignments
           (owner_id, watch_id, supplier_id, modalidade, valor_repasse_fixo)
         values ($1, $2, $3, 'FIXED_PAYOUT', 1000)`,
        [ownerId, watch.id, supplierId],
      );

      await expect(
        ctx.db.query(
          `insert into public.consignments
             (owner_id, watch_id, supplier_id, modalidade, valor_repasse_fixo)
           values ($1, $2, $3, 'FIXED_PAYOUT', 1200)`,
          [ownerId, watch.id, supplierId],
        ),
      ).rejects.toThrow(/consignments_uma_ativa_por_watch/);
    });
  });

  describe("reserva", () => {
    it("permite somente uma reserva ativa por relogio", async () => {
      // Cenario critico da Secao 19.1.
      const watch = await createWatch(ctx.db, ownerId);

      await ctx.db.query(
        `insert into public.reservations
           (owner_id, watch_id, client_id, valor_combinado, validade)
         values ($1, $2, $3, 2000, current_date + 7)`,
        [ownerId, watch.id, clientId],
      );

      await expect(
        ctx.db.query(
          `insert into public.reservations
             (owner_id, watch_id, client_id, valor_combinado, validade)
           values ($1, $2, $3, 2100, current_date + 7)`,
          [ownerId, watch.id, clientId],
        ),
      ).rejects.toThrow(/reservations_uma_ativa_por_watch/);
    });

    it("libera nova reserva depois do cancelamento", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      const first = await ctx.db.query<{ id: string }>(
        `insert into public.reservations
           (owner_id, watch_id, client_id, valor_combinado, validade)
         values ($1, $2, $3, 2000, current_date + 7) returning id`,
        [ownerId, watch.id, clientId],
      );

      await ctx.db.query(
        "update public.reservations set status = 'CANCELLED' where id = $1",
        [first.rows[0].id],
      );

      await expect(
        ctx.db.query(
          `insert into public.reservations
             (owner_id, watch_id, client_id, valor_combinado, validade)
           values ($1, $2, $3, 2100, current_date + 7)`,
          [ownerId, watch.id, clientId],
        ),
      ).resolves.toBeDefined();
    });

    it("calcula o saldo restante sem deixar divergir", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      const reservation = await ctx.db.query<{ saldo_restante: string }>(
        `insert into public.reservations
           (owner_id, watch_id, client_id, valor_combinado, validade, valor_sinal, data_sinal)
         values ($1, $2, $3, 5000, current_date + 7, 1500, current_date)
         returning saldo_restante`,
        [ownerId, watch.id, clientId],
      );

      expect(Number(reservation.rows[0].saldo_restante)).toBe(3500);
    });

    it("impede sinal maior que o valor combinado", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      await expect(
        ctx.db.query(
          `insert into public.reservations
             (owner_id, watch_id, client_id, valor_combinado, validade, valor_sinal, data_sinal)
           values ($1, $2, $3, 1000, current_date + 7, 1500, current_date)`,
          [ownerId, watch.id, clientId],
        ),
      ).rejects.toThrow(/sinal_nao_excede_combinado/);
    });

    it("so aceita destino do sinal em reserva encerrada com sinal", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      await expect(
        ctx.db.query(
          `insert into public.reservations
             (owner_id, watch_id, client_id, valor_combinado, validade, destino_sinal)
           values ($1, $2, $3, 1000, current_date + 7, 'REFUNDED')`,
          [ownerId, watch.id, clientId],
        ),
      ).rejects.toThrow(/destino_sinal_coerente/);
    });
  });

  describe("venda", () => {
    it("impede vender o mesmo relogio duas vezes", async () => {
      // Cenario critico da Secao 19.1.
      const watch = await createWatch(ctx.db, ownerId);
      await createSale(ctx.db, ownerId, watch.id, clientId, 3000);

      await expect(
        createSale(ctx.db, ownerId, watch.id, clientId, 3200),
      ).rejects.toThrow(/sales_watch_unico/);
    });
  });

  describe("livro caixa", () => {
    it("bloqueia lancamento duplicado pela chave de idempotencia", async () => {
      const insert = () =>
        ctx.db.query(
          `insert into public.financial_transactions
             (owner_id, direcao, categoria, valor, idempotency_key)
           values ($1, 'INCOME', 'SALE', 1000, 'venda-123')`,
          [ownerId],
        );

      await expect(insert()).resolves.toBeDefined();
      await expect(insert()).rejects.toThrow(/financial_idempotency_unica/);
    });

    it("permite varios lancamentos sem chave de idempotencia", async () => {
      const insert = () =>
        ctx.db.query(
          `insert into public.financial_transactions
             (owner_id, direcao, categoria, valor)
           values ($1, 'EXPENSE', 'META_ADS', 50)`,
          [ownerId],
        );

      await expect(insert()).resolves.toBeDefined();
      await expect(insert()).resolves.toBeDefined();
    });

    it("recusa categoria incompativel com a direcao", async () => {
      await expect(
        ctx.db.query(
          `insert into public.financial_transactions
             (owner_id, direcao, categoria, valor)
           values ($1, 'INCOME', 'META_ADS', 50)`,
          [ownerId],
        ),
      ).rejects.toThrow(/categoria_conforme_direcao/);
    });
  });

  describe("oportunidade de compra", () => {
    it("exige relogio e valor fechado quando marcada como comprada", async () => {
      const opportunity = await ctx.db.query<{ id: string }>(
        `insert into public.purchase_opportunities (owner_id, modelo)
         values ($1, 'Speedmaster') returning id`,
        [ownerId],
      );

      await expect(
        ctx.db.query(
          "update public.purchase_opportunities set status = 'PURCHASED' where id = $1",
          [opportunity.rows[0].id],
        ),
      ).rejects.toThrow(/comprada_tem_vinculo/);
    });

    it("nao vincula relogio a oportunidade ainda em negociacao", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      await expect(
        ctx.db.query(
          `insert into public.purchase_opportunities
             (owner_id, modelo, purchased_watch_id)
           values ($1, 'Speedmaster', $2)`,
          [ownerId, watch.id],
        ),
      ).rejects.toThrow(/vinculo_apenas_se_comprada/);
    });
  });

  describe("fotos", () => {
    it("permite apenas uma capa por relogio", async () => {
      const watch = await createWatch(ctx.db, ownerId);

      const insertCover = (file: string) =>
        ctx.db.query(
          `insert into public.watch_photos (owner_id, watch_id, storage_path, is_cover)
           values ($1, $2, $3, true)`,
          [ownerId, watch.id, `${ownerId}/${watch.id}/${file}.jpg`],
        );

      await expect(insertCover("a")).resolves.toBeDefined();
      await expect(insertCover("b")).rejects.toThrow(/watch_photos_uma_capa/);
    });
  });
});
