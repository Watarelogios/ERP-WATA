// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  applyMigrations,
  createTestDatabase,
  type TestDatabase,
} from "./helpers/database";

/**
 * Checkpoint da Fase 2: "banco limpo sobe sem erro".
 *
 * As migrations reais rodam contra um Postgres de verdade (PGlite, em memoria),
 * entao o teste falha antes de o SQL chegar ao projeto hospedado.
 */
describe("migrations", () => {
  let ctx: TestDatabase;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("cria todas as tabelas do modelo de dados", async () => {
    const result = await ctx.db.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "clients",
      "consignment_payouts",
      "consignments",
      "customer_credit_movements",
      "expenses",
      "financial_transactions",
      "profiles",
      "purchase_opportunities",
      "reservations",
      "sales",
      "settings",
      "suppliers",
      "watch_photos",
      "watch_status_history",
      "watches",
    ]);
  });

  it("cria as views do dashboard", async () => {
    const result = await ctx.db.query<{ table_name: string }>(`
      select table_name from information_schema.views
      where table_schema = 'public' order by table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "active_alerts",
      "customer_credit_balances",
      "dashboard_summary",
      "monthly_sales_profit",
      "sales_by_origin",
      "stock_aging",
      "stock_valuation",
    ]);
  });

  it("cria todos os enums da Secao 9", async () => {
    const result = await ctx.db.query<{ typname: string }>(`
      select t.typname from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e'
      order by t.typname
    `);

    expect(result.rows.map((row) => row.typname)).toEqual([
      "consignment_mode",
      "credit_movement_type",
      "deposit_fate",
      "expense_category",
      "financial_category",
      "financial_direction",
      "financial_status",
      "movement_type",
      "payout_status",
      "purchase_status",
      "reservation_status",
      "role_type",
      "supplier_relation",
      "watch_status",
      "watch_type",
    ]);
  });

  it("habilita RLS em toda tabela exposta pela Data API", async () => {
    const result = await ctx.db.query<{ tablename: string }>(`
      select tablename from pg_tables
      where schemaname = 'public' and not rowsecurity
      order by tablename
    `);

    expect(result.rows).toEqual([]);
  });

  it("declara as views com security_invoker para nao contornar o RLS", async () => {
    const result = await ctx.db.query<{ viewname: string }>(`
      select c.relname as viewname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'
        and not coalesce(
          (select option_value = 'true' from pg_options_to_table(c.reloptions)
            where option_name = 'security_invoker'),
          false
        )
      order by c.relname
    `);

    expect(result.rows).toEqual([]);
  });

  it("cria o bucket privado das fotografias", async () => {
    const result = await ctx.db.query<{
      id: string;
      public: boolean;
      allowed_mime_types: string[];
    }>("select id, public, allowed_mime_types from storage.buckets");

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe("wata-watch-photos");
    expect(result.rows[0].public).toBe(false);
    expect(result.rows[0].allowed_mime_types).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("cria o profile automaticamente ao surgir um usuario", async () => {
    const userId = await ctx.createUser("admin@wata.test");

    const result = await ctx.db.query<{ id: string; role: string }>(
      "select id, role from public.profiles where id = $1",
      [userId],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].role).toBe("ADMIN");
  });
});

describe("reaplicacao", () => {
  /*
   * A Secao 8.1 exige migration revisavel e reaplicavel. Rodar a suite inteira
   * duas vezes no mesmo banco nao pode quebrar.
   */
  it("aplica as migrations duas vezes sem erro", async () => {
    const ctx = await createTestDatabase();

    try {
      await expect(applyMigrations(ctx.db)).resolves.toBeUndefined();
    } finally {
      await ctx.close();
    }
  });
});
