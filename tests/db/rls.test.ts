// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";
import { createClient, createWatch } from "./helpers/fixtures";

/**
 * Isolamento por owner_id (Secao 17 e cenarios criticos da Secao 19.1).
 *
 * As consultas rodam com o papel `authenticated`, que nao e dono das tabelas
 * nem superusuario — entao o RLS realmente vale. Um teste que rodasse como
 * superusuario passaria mesmo com as politicas erradas.
 */
describe("RLS", () => {
  let ctx: TestDatabase;
  let alice: string;
  let bob: string;
  let watchDaAlice: string;
  let clienteDaAlice: string;

  beforeAll(async () => {
    ctx = await createTestDatabase();
    alice = await ctx.createUser("alice@wata.test");
    bob = await ctx.createUser("bob@wata.test");

    const watch = await createWatch(ctx.db, alice, { marca: "Omega" });
    watchDaAlice = watch.id;
    clienteDaAlice = await createClient(ctx.db, alice, "Cliente da Alice");
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("cada usuario le apenas os proprios relogios", async () => {
    const daAlice = await ctx.asUser(alice, () =>
      ctx.db.query("select id from public.watches"),
    );
    const doBob = await ctx.asUser(bob, () =>
      ctx.db.query("select id from public.watches"),
    );

    expect(daAlice.rows).toHaveLength(1);
    expect(doBob.rows).toHaveLength(0);
  });

  it("consulta direta por id nao vaza registro de outro usuario", async () => {
    const result = await ctx.asUser(bob, () =>
      ctx.db.query("select id from public.watches where id = $1", [
        watchDaAlice,
      ]),
    );

    expect(result.rows).toHaveLength(0);
  });

  it("impede criar registro em nome de outro usuario", async () => {
    // Sem WITH CHECK no INSERT, este insert passaria.
    await expect(
      ctx.asUser(bob, () =>
        ctx.db.query(
          `insert into public.watches (owner_id, marca, modelo, tipo, valor_compra)
           values ($1, 'Falso', 'Modelo', 'OWNED', 100)`,
          [alice],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("nao altera registro de outro usuario", async () => {
    const result = await ctx.asUser(bob, () =>
      ctx.db.query(
        "update public.watches set valor_anunciado = 1 where id = $1",
        [watchDaAlice],
      ),
    );

    expect(result.affectedRows).toBe(0);
  });

  it("nao transfere a propriedade de um registro", async () => {
    await expect(
      ctx.asUser(alice, () =>
        ctx.db.query("update public.watches set owner_id = $1 where id = $2", [
          bob,
          watchDaAlice,
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("nao apaga registro de outro usuario", async () => {
    const result = await ctx.asUser(bob, () =>
      ctx.db.query("delete from public.clients where id = $1", [
        clienteDaAlice,
      ]),
    );

    expect(result.affectedRows).toBe(0);

    const aindaExiste = await ctx.db.query(
      "select id from public.clients where id = $1",
      [clienteDaAlice],
    );
    expect(aindaExiste.rows).toHaveLength(1);
  });

  it("cada usuario le apenas o proprio profile", async () => {
    const result = await ctx.asUser(bob, () =>
      ctx.db.query<{ id: string }>("select id from public.profiles"),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(bob);
  });

  it("as views do dashboard respeitam o RLS", async () => {
    const daAlice = await ctx.asUser(alice, () =>
      ctx.db.query("select owner_id from public.dashboard_summary"),
    );
    const doBob = await ctx.asUser(bob, () =>
      ctx.db.query<{ owner_id: string }>(
        "select owner_id from public.dashboard_summary",
      ),
    );

    expect(daAlice.rows).toHaveLength(1);
    expect(doBob.rows).toHaveLength(1);
    expect(doBob.rows[0].owner_id).toBe(bob);
  });

  describe("trilha de auditoria", () => {
    it("aceita insercao no historico de status", async () => {
      await expect(
        ctx.asUser(alice, () =>
          ctx.db.query(
            `insert into public.watch_status_history
               (owner_id, watch_id, status_anterior, status_novo, motivo)
             values ($1, $2, 'AVAILABLE', 'RESERVED', 'reserva criada')`,
            [alice, watchDaAlice],
          ),
        ),
      ).resolves.toBeDefined();
    });

    it("nao permite reescrever o historico", async () => {
      const result = await ctx.asUser(alice, () =>
        ctx.db.query(
          "update public.watch_status_history set motivo = 'alterado' where owner_id = $1",
          [alice],
        ),
      );

      // Sem politica de UPDATE, o RLS nao expoe nenhuma linha para alterar.
      expect(result.affectedRows).toBe(0);
    });

    it("nao permite apagar o historico", async () => {
      const result = await ctx.asUser(alice, () =>
        ctx.db.query(
          "delete from public.watch_status_history where owner_id = $1",
          [alice],
        ),
      );

      expect(result.affectedRows).toBe(0);

      const restante = await ctx.db.query(
        "select id from public.watch_status_history where owner_id = $1",
        [alice],
      );
      expect(restante.rows.length).toBeGreaterThan(0);
    });
  });

  describe("acesso anonimo", () => {
    it("nao concede privilegio de leitura ao papel anon", async () => {
      const result = await ctx.db.query<{ table_name: string }>(`
        select table_name from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public'
      `);

      expect(result.rows).toEqual([]);
    });
  });
});
