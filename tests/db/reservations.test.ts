// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import { createClient, createWatch } from "./helpers/fixtures";

/**
 * Reservas (Secoes 13.2 e 13.3).
 *
 * Checkpoint da fase: "sem duplicar status ou caixa".
 */
describe("reservas", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;
  let clientId: string;

  async function caixa(userId = owner) {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [userId],
    );

    return Number(result.rows[0].caixa);
  }

  async function reservar(
    watchId: string,
    valorCombinado = 5000,
    sinal = 0,
    userId = owner,
  ) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{
        reservation_id: string;
        watch_status: string;
        saldo_restante: string;
      }>(
        `select * from public.create_reservation(
           p_watch_id => $1,
           p_client_id => $2,
           p_valor_combinado => $3,
           p_validade => current_date + 7,
           p_valor_sinal => $4
         )`,
        [watchId, clientId, valorCombinado, sinal],
      ),
    );
  }

  async function cancelar(
    reservationId: string,
    destino: string | null = null,
    status = "CANCELLED",
  ) {
    return ctx.asUser(owner, () =>
      ctx.db.query(
        `select * from public.cancel_reservation(
           p_reservation_id => $1,
           p_status => $2::public.reservation_status,
           p_destino_sinal => $3::public.deposit_fate
         )`,
        [reservationId, status, destino],
      ),
    );
  }

  async function statusDoRelogio(watchId: string) {
    const result = await ctx.db.query<{ status: string }>(
      "select status from public.watches where id = $1",
      [watchId],
    );

    return result.rows[0].status;
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");
    clientId = await createClient(ctx.db, owner);

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 10000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe("criar", () => {
    it("reserva o relogio e devolve o saldo restante", async () => {
      const watch = await createWatch(ctx.db, owner);
      const result = await reservar(watch.id, 5000, 1500);

      expect(result.rows[0].watch_status).toBe("RESERVED");
      expect(Number(result.rows[0].saldo_restante)).toBe(3500);
      expect(await statusDoRelogio(watch.id)).toBe("RESERVED");
    });

    it("lanca o sinal no caixa uma unica vez", async () => {
      const antes = await caixa();
      const watch = await createWatch(ctx.db, owner);

      await reservar(watch.id, 4000, 800);

      expect(await caixa()).toBe(antes + 800);

      const lancamentos = await ctx.db.query<{ categoria: string }>(
        `select categoria from public.financial_transactions
         where watch_id = $1 and direcao = 'INCOME'`,
        [watch.id],
      );

      expect(lancamentos.rows).toHaveLength(1);
      expect(lancamentos.rows[0].categoria).toBe("RESERVATION_DEPOSIT");
    });

    it("nao mexe no caixa quando nao ha sinal", async () => {
      const antes = await caixa();
      const watch = await createWatch(ctx.db, owner);

      await reservar(watch.id, 4000, 0);

      expect(await caixa()).toBe(antes);
    });

    it("registra a mudanca de status no historico", async () => {
      const watch = await createWatch(ctx.db, owner);
      await reservar(watch.id);

      const historico = await ctx.db.query<{
        status_anterior: string;
        status_novo: string;
      }>(
        "select status_anterior, status_novo from public.watch_status_history where watch_id = $1",
        [watch.id],
      );

      expect(historico.rows).toHaveLength(1);
      expect(historico.rows[0].status_anterior).toBe("AVAILABLE");
      expect(historico.rows[0].status_novo).toBe("RESERVED");
    });

    it("recusa uma segunda reserva do mesmo relogio", async () => {
      const watch = await createWatch(ctx.db, owner);
      await reservar(watch.id);

      await expect(reservar(watch.id)).rejects.toThrow(/nao pode ser reservado/i);
    });

    it("recusa sinal maior que o valor combinado", async () => {
      const watch = await createWatch(ctx.db, owner);

      await expect(reservar(watch.id, 1000, 1500)).rejects.toThrow(
        /sinal nao pode ser maior/i,
      );

      expect(await statusDoRelogio(watch.id)).toBe("AVAILABLE");
    });

    it("nao reserva relogio de outro usuario", async () => {
      const watch = await createWatch(ctx.db, owner);

      await expect(reservar(watch.id, 5000, 0, outro)).rejects.toThrow(
        /nao encontrado/i,
      );

      expect(await statusDoRelogio(watch.id)).toBe("AVAILABLE");
    });

    it("nao deixa o relogio reservado quando a operacao falha", async () => {
      const watch = await createWatch(ctx.db, owner);

      await expect(reservar(watch.id, -1)).rejects.toThrow();

      expect(await statusDoRelogio(watch.id)).toBe("AVAILABLE");

      const reservas = await ctx.db.query(
        "select id from public.reservations where watch_id = $1",
        [watch.id],
      );
      expect(reservas.rows).toEqual([]);
    });
  });

  describe("cancelar sem sinal", () => {
    it("devolve o relogio para disponivel", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 3000, 0)).rows[0];

      const antes = await caixa();
      await cancelar(reservation_id);

      expect(await statusDoRelogio(watch.id)).toBe("AVAILABLE");
      expect(await caixa()).toBe(antes);
    });

    it("libera o relogio para uma nova reserva", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 3000, 0)).rows[0];
      await cancelar(reservation_id);

      await expect(reservar(watch.id, 3200, 0)).resolves.toBeDefined();
    });
  });

  describe("sinal devolvido", () => {
    it("cria a saida e preserva a entrada original", async () => {
      const watch = await createWatch(ctx.db, owner);
      const antes = await caixa();
      const { reservation_id } = (await reservar(watch.id, 5000, 1000)).rows[0];

      expect(await caixa()).toBe(antes + 1000);

      await cancelar(reservation_id, "REFUNDED");

      // Entrou e saiu: o caixa volta ao valor anterior.
      expect(await caixa()).toBe(antes);

      const lancamentos = await ctx.db.query<{
        direcao: string;
        categoria: string;
      }>(
        // Ordena por texto: em enum, `order by` segue a ordem de declaracao.
        `select direcao, categoria from public.financial_transactions
         where reservation_id = $1 order by categoria::text`,
        [reservation_id],
      );

      // A entrada original continua no extrato, ao lado da devolucao.
      expect(lancamentos.rows).toEqual([
        { direcao: "EXPENSE", categoria: "DEPOSIT_REFUND" },
        { direcao: "INCOME", categoria: "RESERVATION_DEPOSIT" },
      ]);
    });
  });

  describe("sinal retido", () => {
    it("mantem o dinheiro no caixa e reclassifica o lancamento", async () => {
      const watch = await createWatch(ctx.db, owner);
      const antes = await caixa();
      const { reservation_id } = (await reservar(watch.id, 5000, 700)).rows[0];

      await cancelar(reservation_id, "RETAINED");

      // O sinal continua no caixa; nao ha lancamento novo somando de novo.
      expect(await caixa()).toBe(antes + 700);

      const lancamentos = await ctx.db.query<{ categoria: string }>(
        "select categoria from public.financial_transactions where reservation_id = $1",
        [reservation_id],
      );

      expect(lancamentos.rows).toEqual([{ categoria: "RETAINED_DEPOSIT" }]);
    });
  });

  describe("sinal virando credito", () => {
    it("cria o credito sem nova entrada de caixa", async () => {
      const watch = await createWatch(ctx.db, owner);
      const antes = await caixa();
      const { reservation_id } = (await reservar(watch.id, 5000, 900)).rows[0];

      await cancelar(reservation_id, "CUSTOMER_CREDIT");

      // O dinheiro ja estava no caixa; o que muda e a obrigacao com o cliente.
      expect(await caixa()).toBe(antes + 900);

      const creditos = await ctx.db.query<{ tipo: string; valor: string }>(
        "select tipo, valor from public.customer_credit_movements where reservation_id = $1",
        [reservation_id],
      );

      expect(creditos.rows).toHaveLength(1);
      expect(creditos.rows[0].tipo).toBe("CREDIT");
      expect(Number(creditos.rows[0].valor)).toBe(900);

      const saldo = await ctx.db.query<{ saldo: string }>(
        "select saldo from public.customer_credit_balances where client_id = $1",
        [clientId],
      );
      expect(Number(saldo.rows[0].saldo)).toBeGreaterThanOrEqual(900);
    });
  });

  describe("regras de encerramento", () => {
    it("exige o destino quando houve sinal", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 5000, 500)).rows[0];

      await expect(cancelar(reservation_id, null)).rejects.toThrow(
        /destino do sinal/i,
      );

      expect(await statusDoRelogio(watch.id)).toBe("RESERVED");
    });

    it("recusa encerrar duas vezes", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 3000, 0)).rows[0];
      await cancelar(reservation_id);

      await expect(cancelar(reservation_id)).rejects.toThrow(
        /ja foi encerrada/i,
      );
    });

    it("aceita expiracao como encerramento", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 3000, 0)).rows[0];

      await cancelar(reservation_id, null, "EXPIRED");

      const reserva = await ctx.db.query<{ status: string }>(
        "select status from public.reservations where id = $1",
        [reservation_id],
      );

      expect(reserva.rows[0].status).toBe("EXPIRED");
      expect(await statusDoRelogio(watch.id)).toBe("AVAILABLE");
    });

    it("recusa status invalido de encerramento", async () => {
      const watch = await createWatch(ctx.db, owner);
      const { reservation_id } = (await reservar(watch.id, 3000, 0)).rows[0];

      await expect(cancelar(reservation_id, null, "COMPLETED")).rejects.toThrow(
        /encerramento invalido/i,
      );
    });
  });
});
