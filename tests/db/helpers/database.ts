import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

/**
 * Objetos que o Supabase fornece prontos e as migrations assumem existir.
 *
 * Reproduzir a superficie usada (auth.users, auth.uid, papeis, storage) permite
 * rodar as migrations reais contra um Postgres de verdade, em memoria, sem
 * Docker e sem tocar no projeto hospedado.
 */
const SUPABASE_STUBS = /* sql */ `
  create schema if not exists extensions;
  create schema if not exists auth;
  create schema if not exists storage;

  do $$
  begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls;
    end if;
  end
  $$;

  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth, storage to authenticated, service_role;
  alter default privileges in schema public
    grant all on tables to authenticated, service_role;
  alter default privileges in schema public
    grant all on sequences to authenticated, service_role;

  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  /*
   * No Supabase auth.uid() le a claim "sub" do JWT. Nos testes o usuario
   * corrente vem de uma GUC, o que permite alternar de identidade e verificar
   * o isolamento por RLS.
   */
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('wata.test_user', true), '')::uuid;
  $$;

  grant execute on function auth.uid() to anon, authenticated, service_role;

  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid,
    created_at timestamptz not null default now()
  );

  alter table storage.objects enable row level security;

  create or replace function storage.foldername(name text)
  returns text[]
  language sql
  immutable
  as $$
    select string_to_array(name, '/');
  $$;
`;

export type TestDatabase = {
  db: PGlite;
  /** Executa como usuario autenticado, respeitando RLS. */
  asUser<T>(userId: string, run: () => Promise<T>): Promise<T>;
  /** Cria um usuario em auth.users e devolve o id. */
  createUser(email: string): Promise<string>;
  close(): Promise<void>;
};

async function migrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);

  return entries.filter((file) => file.endsWith(".sql")).sort();
}

/**
 * Aplica todas as migrations na ordem numerica.
 *
 * Exportada para que o teste consiga rodar a suite duas vezes no mesmo banco e
 * comprovar a reaplicabilidade exigida na Secao 8.1.
 */
export async function applyMigrations(db: PGlite): Promise<void> {
  for (const file of await migrationFiles()) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

    try {
      await db.exec(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha na migration ${file}: ${message}`);
    }
  }
}

/**
 * Sobe um Postgres limpo e aplica todas as migrations na ordem.
 *
 * Se qualquer migration falhar, o erro aparece aqui com o nome do arquivo —
 * que e exatamente o checkpoint da Fase 2: "banco limpo sobe sem erro".
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create({
    extensions: { pgcrypto, pg_trgm },
  });

  await db.exec(SUPABASE_STUBS);
  await applyMigrations(db);

  /*
   * Troca de identidade no nivel da sessao (e nao `set local`), porque cada
   * statement roda em sua propria transacao implicita: `set local` seria
   * desfeito antes da consulta seguinte.
   *
   * O papel `authenticated` nao e dono das tabelas nem superusuario, entao o
   * RLS vale de verdade aqui — e o que torna o teste de isolamento honesto.
   */
  async function asUser<T>(userId: string, run: () => Promise<T>): Promise<T> {
    await db.query("select set_config('wata.test_user', $1, false)", [userId]);
    await db.exec("set role authenticated;");

    try {
      return await run();
    } finally {
      await db.exec("reset role;");
      await db.query("select set_config('wata.test_user', '', false)");
    }
  }

  async function createUser(email: string): Promise<string> {
    const result = await db.query<{ id: string }>(
      "insert into auth.users (email) values ($1) returning id",
      [email],
    );

    return result.rows[0].id;
  }

  return {
    db,
    asUser,
    createUser,
    close: () => db.close(),
  };
}
