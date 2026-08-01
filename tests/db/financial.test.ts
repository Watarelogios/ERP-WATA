// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import { createClient, createWatch } from "./helpers/fixtures";

/**
 * Livro caixa e estornos (Secoes 12 e 18).
 *
 * Checkpoint da fase: "saldo explicavel" — caixa e sempre
 * saldo_inicial + entradas CONFIRMED - saidas CONFIRMED.
 */
describe("financeiro", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;

  async function caixa() {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    return Number(result.rows[0].caixa);
  }

  async function lancar(
    direcao: "INCOME" | "EXPENSE",
    categoria: string,
    valor: number,
    status = "CONFIRMED",
  ) {
    const result = await ctx.db.query<{ id: string }>(
      `insert into public.financial_transactions
         (owner_id, direcao, categoria, valor, status)
       values ($1, $2, $3::public.financial_category, $4, $5::public.financial_status)
       returning id`,
      [owner, direcao, categoria, valor, status],
    );

    return result.rows[0].id;
  }

  async function estornar(transactionId: string, userId = owner) {
    return ctx.asUser(userId, () =>
      ctx.db.query(
        `select * from public.reverse_financial_transaction(
           p_transaction_id => $1, p_motivo => 'lancamento duplicado'
         )`,
        [transactionId],
      ),
    );
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 10000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe("saldo", () => {
    it("parte do saldo inicial configurado", async () => {
      expect(await caixa()).toBe(10000);
    });

    it("soma entradas e subtrai saidas confirmadas", async () => {
      await lancar("INCOME", "OTHER_INCOME", 2000);
      await lancar("EXPENSE", "META_ADS", 500);

      expect(await caixa()).toBe(11500);
    });

    it("ignora lancamento pendente", async () => {
      const antes = await caixa();
      await lancar("INCOME", "OTHER_INCOME", 9999, "PENDING");

      expect(await caixa()).toBe(antes);
    });
  });

  describe("estorno", () => {
    it("tira o lancamento do caixa sem apagar o registro", async () => {
      const antes = await caixa();
      const id = await lancar("EXPENSE", "SHIPPING", 300);

      expect(await caixa()).toBe(antes - 300);

      await estornar(id);

      expect(await caixa()).toBe(antes);

      // Historico preservado (Secao 18).
      const row = await ctx.db.query<{ status: string; descricao: string | null }>(
        "select status, descricao from public.financial_transactions where id = $1",
        [id],
      );
      expect(row.rows).toHaveLength(1);
      expect(row.rows[0].status).toBe("REVERSED");
      expect(row.rows[0].descricao).toContain("lancamento duplicado");
    });

    it("estorna a despesa vinculada e recalcula o lucro", async () => {
      const clientId = await createClient(ctx.db, owner);
      const watch = await createWatch(ctx.db, owner, { valorCompra: 1000 });

      const transacaoId = await lancar("EXPENSE", "SERVICE", 200);

      await ctx.db.query(
        `insert into public.expenses
           (owner_id, watch_id, categoria, valor, status, financial_transaction_id)
         values ($1, $2, 'SERVICE', 200, 'CONFIRMED', $3)`,
        [owner, watch.id, transacaoId],
      );

      const sale = await ctx.db.query<{ id: string }>(
        `insert into public.sales (owner_id, watch_id, client_id, valor_venda)
         values ($1, $2, $3, 2000) returning id`,
        [owner, watch.id, clientId],
      );

      const antes = await ctx.db.query<{ lucro_liquido: string }>(
        "select lucro_liquido from public.sales where id = $1",
        [sale.rows[0].id],
      );
      expect(Number(antes.rows[0].lucro_liquido)).toBe(800);

      await estornar(transacaoId);

      // Despesa estornada nao pesa mais no lucro.
      const depois = await ctx.db.query<{ lucro_liquido: string }>(
        "select lucro_liquido from public.sales where id = $1",
        [sale.rows[0].id],
      );
      expect(Number(depois.rows[0].lucro_liquido)).toBe(1000);
    });

    it("recusa estornar duas vezes", async () => {
      const id = await lancar("EXPENSE", "PACKAGING", 100);
      await estornar(id);

      await expect(estornar(id)).rejects.toThrow(/somente lancamento confirmado/i);
    });

    it("recusa estornar lancamento de venda isoladamente", async () => {
      /*
       * Desfazer a entrada de uma venda sem desfazer a venda deixaria caixa e
       * estoque contando historias diferentes.
       */
      const id = await lancar("INCOME", "SALE", 5000);

      await expect(estornar(id)).rejects.toThrow(/pertence a uma operacao/i);
    });

    it("recusa estornar sinal de reserva isoladamente", async () => {
      const id = await lancar("INCOME", "RESERVATION_DEPOSIT", 500);

      await expect(estornar(id)).rejects.toThrow(/pertence a uma operacao/i);
    });

    it("nao estorna lancamento de outro usuario", async () => {
      const id = await lancar("EXPENSE", "OTHER_EXPENSE", 400);

      await expect(estornar(id, outro)).rejects.toThrow(/nao encontrado/i);

      const row = await ctx.db.query<{ status: string }>(
        "select status from public.financial_transactions where id = $1",
        [id],
      );
      expect(row.rows[0].status).toBe("CONFIRMED");
    });
  });
});
