/**
 * Gera src/lib/types/database.ts a partir das migrations.
 *
 * As migrations sao aplicadas em um Postgres em memoria (PGlite) e o schema
 * resultante e introspectado. Assim os tipos saem do mesmo SQL que vai para o
 * banco, sem depender de credenciais nem de projeto hospedado.
 *
 * Quando a Supabase CLI estiver conectada ao projeto, `supabase gen types` faz
 * o mesmo papel e passa a ser a fonte canonica.
 *
 *   node scripts/generate-database-types.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = path.resolve("supabase/migrations");
const OUTPUT = path.resolve("src/lib/types/database.ts");

const SUPABASE_STUBS = `
  create schema if not exists extensions;
  create schema if not exists auth;
  create schema if not exists storage;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls; end if;
  end $$;
  grant usage on schema public to anon, authenticated, service_role;
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('wata.test_user', true), '')::uuid; $$;
  create table if not exists storage.buckets (
    id text primary key, name text not null, public boolean not null default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text not null, owner uuid, created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
  create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
    select string_to_array(name, '/'); $$;
`;

/** Mapeia o tipo do Postgres para o tipo TypeScript equivalente. */
function tsType(column) {
  if (column.data_type === "ARRAY") {
    return `${tsType({ ...column, data_type: column.element_type ?? "text" })}[]`;
  }

  if (column.udt_schema === "public" && column.data_type === "USER-DEFINED") {
    return `Database["public"]["Enums"]["${column.udt_name}"]`;
  }

  switch (column.data_type) {
    case "uuid":
    case "text":
    case "character varying":
    case "character":
    case "date":
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "time with time zone":
    case "time without time zone":
    case "interval":
      return "string";
    case "numeric":
    case "integer":
    case "smallint":
    case "bigint":
    case "real":
    case "double precision":
      return "number";
    case "boolean":
      return "boolean";
    case "json":
    case "jsonb":
      return "Json";
    default:
      return "unknown";
  }
}

async function main() {
  const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm } });
  await db.exec(SUPABASE_STUBS);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await db.exec(await readFile(path.join(MIGRATIONS_DIR, file), "utf8"));
  }

  const enums = await db.query(`
    select t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname
  `);

  const relations = await db.query(`
    select c.relname as name,
           case when c.relkind = 'v' then 'view' else 'table' end as kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
    order by c.relkind desc, c.relname
  `);

  const columns = await db.query(`
    select c.table_name, c.column_name, c.data_type, c.udt_name,
           c.is_nullable, c.column_default, c.is_generated, c.is_identity,
           e.data_type as element_type
    from information_schema.columns c
    left join information_schema.element_types e
      on e.object_catalog = c.table_catalog
     and e.object_schema = c.table_schema
     and e.object_name = c.table_name
     and e.object_type = 'TABLE'
     and e.collection_type_identifier = c.dtd_identifier
    where c.table_schema = 'public'
    order by c.table_name, c.ordinal_position
  `);

  const functions = await db.query(`
    select p.proname as name,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as result
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname not like 'trg_%'
      and p.proname not in ('set_updated_at', 'handle_new_user', 'prevent_wata_id_change')
    order by p.proname
  `);

  /*
   * Chaves estrangeiras: o supabase-js resolve joins aninhados (ex.:
   * `photos:watch_photos ( ... )`) pelas Relationships; sem elas o join tipa
   * como erro.
   */
  const foreignKeys = await db.query(`
    select
      c.conname as name,
      src.relname as table_name,
      (select array_agg(a.attname order by k.ord)
         from unnest(c.conkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      ) as columns,
      dst.relname as referenced_table,
      (select array_agg(a.attname order by k.ord)
         from unnest(c.confkey) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum
      ) as referenced_columns,
      exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indisunique
          -- Indice parcial (ex.: uma capa por relogio) nao torna a relacao 1:1.
          and i.indpred is null
          and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x)
            = (select array_agg(x order by x) from unnest(c.conkey) x)
      ) as is_one_to_one
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class dst on dst.oid = c.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    join pg_namespace dn on dn.oid = dst.relnamespace
    where c.contype = 'f' and n.nspname = 'public' and dn.nspname = 'public'
    order by src.relname, c.conname
  `);

  const fksByTable = new Map();
  for (const fk of foreignKeys.rows) {
    if (!fksByTable.has(fk.table_name)) fksByTable.set(fk.table_name, []);
    fksByTable.get(fk.table_name).push(fk);
  }

  function relationshipsBlock(name) {
    const fks = fksByTable.get(name) ?? [];

    if (fks.length === 0) {
      return "        Relationships: []";
    }

    const items = fks
      .map(
        (fk) =>
          `          {\n` +
          `            foreignKeyName: "${fk.name}"\n` +
          `            columns: [${fk.columns.map((col) => `"${col}"`).join(", ")}]\n` +
          `            isOneToOne: ${fk.is_one_to_one}\n` +
          `            referencedRelation: "${fk.referenced_table}"\n` +
          `            referencedColumns: [${fk.referenced_columns.map((col) => `"${col}"`).join(", ")}]\n` +
          `          }`,
      )
      .join(",\n");

    return `        Relationships: [\n${items},\n        ]`;
  }

  const byTable = new Map();
  for (const column of columns.rows) {
    if (!byTable.has(column.table_name)) byTable.set(column.table_name, []);
    byTable.get(column.table_name).push({
      ...column,
      udt_schema: "public",
    });
  }

  const enumNames = new Set(enums.rows.map((row) => row.name));

  function columnType(column) {
    const isEnum = enumNames.has(column.udt_name);
    const base = isEnum
      ? `Database["public"]["Enums"]["${column.udt_name}"]`
      : tsType(column);

    return base;
  }

  function renderRelation(name, kind) {
    const cols = byTable.get(name) ?? [];

    const row = cols
      .map((c) => {
        const nullable = c.is_nullable === "YES";
        return `          ${c.column_name}: ${columnType(c)}${nullable ? " | null" : ""}`;
      })
      .join("\n");

    if (kind === "view") {
      return (
        `      ${name}: {\n` +
        `        Row: {\n${row}\n        }\n` +
        `${relationshipsBlock(name)}\n` +
        `      }`
      );
    }

    const insert = cols
      .filter((c) => c.is_generated !== "ALWAYS")
      .map((c) => {
        const nullable = c.is_nullable === "YES";
        const optional = nullable || c.column_default !== null;
        return `          ${c.column_name}${optional ? "?" : ""}: ${columnType(c)}${nullable ? " | null" : ""}`;
      })
      .join("\n");

    const update = cols
      .filter((c) => c.is_generated !== "ALWAYS")
      .map((c) => {
        const nullable = c.is_nullable === "YES";
        return `          ${c.column_name}?: ${columnType(c)}${nullable ? " | null" : ""}`;
      })
      .join("\n");

    return (
      `      ${name}: {\n` +
      `        Row: {\n${row}\n        }\n` +
      `        Insert: {\n${insert}\n        }\n` +
      `        Update: {\n${update}\n        }\n` +
      `${relationshipsBlock(name)}\n` +
      `      }`
    );
  }

  const tables = relations.rows
    .filter((r) => r.kind === "table")
    .map((r) => renderRelation(r.name, "table"))
    .join("\n");

  const views = relations.rows
    .filter((r) => r.kind === "view")
    .map((r) => renderRelation(r.name, "view"))
    .join("\n");

  const enumBlock = enums.rows
    .map(
      (row) =>
        `      ${row.name}: ${row.labels.map((label) => `"${label}"`).join(" | ")}`,
    )
    .join("\n");

  // Tipos SQL simples -> TypeScript, para args e retorno das funcoes.
  function sqlToTs(sqlType) {
    const base = sqlType.replace(/^setof /, "").trim();
    if (/^(text|uuid|character|date|timestamp)/.test(base)) return "string";
    if (/^(numeric|integer|bigint|smallint|real|double)/.test(base)) {
      return "number";
    }
    if (base === "boolean") return "boolean";
    if (/^(json|jsonb)$/.test(base)) return "Json";
    if (base === "void") return "undefined";
    return "unknown";
  }

  const functionBlock = functions.rows
    .map((row) => {
      const args = row.args
        ? row.args.split(", ").map((arg) => {
            // "p_watch_id uuid" ou "p_sale_id uuid DEFAULT NULL::uuid"
            const [nome, tipo] = arg.trim().split(/\s+/);
            const opcional = /DEFAULT/i.test(arg);
            return `${nome}${opcional ? "?" : ""}: ${sqlToTs(tipo ?? "unknown")}`;
          })
        : [];

      const argsBlock = args.length
        ? `{ ${args.join("; ")} }`
        : "Record<PropertyKey, never>";

      return (
        `      ${row.name}: {\n` +
        `        Args: ${argsBlock}\n` +
        `        Returns: ${sqlToTs(row.result)}\n` +
        `      }`
      );
    })
    .join("\n");

  const output = `/**
 * NAO EDITE ESTE ARQUIVO A MAO.
 *
 * Gerado a partir de supabase/migrations por:
 *   npm run db:types
 *
 * Depois de conectar a Supabase CLI ao projeto, o comando equivalente e:
 *   npx supabase gen types typescript --linked > src/lib/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${tables}
    }
    Views: {
${views}
    }
    Functions: {
${functionBlock}
    }
    Enums: {
${enumBlock}
    }
    CompositeTypes: Record<string, never>
  }
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
`;

  await writeFile(OUTPUT, output, "utf8");
  await db.close();

  console.log(
    `Tipos gerados: ${relations.rows.length} relacoes, ${enums.rows.length} enums -> ${path.relative(process.cwd(), OUTPUT)}`,
  );
}

await main();
