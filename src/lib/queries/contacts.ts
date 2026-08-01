import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { PAGE_SIZE, pageRange } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/types/database";

export type ClientRow = Pick<
  Tables<"clients">,
  | "id"
  | "nome"
  | "cidade"
  | "telefone"
  | "instagram"
  | "interesses"
  | "observacoes"
  | "ativo"
>;

export type SupplierRow = Pick<
  Tables<"suppliers">,
  | "id"
  | "nome"
  | "cidade"
  | "telefone"
  | "instagram"
  | "tipo_relacao"
  | "observacoes"
  | "ativo"
>;

export type ContactListParams = {
  q?: string;
  pagina?: string;
  /** "inativos" inclui os desativados; o padrao mostra so os ativos. */
  mostrar?: string;
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Escapa os curingas do ILIKE para a busca tratar % e _ como literais. */
function likePattern(term: string): string {
  return `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
}

export async function listClients(
  params: ContactListParams,
): Promise<Paged<ClientRow>> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { page, from, to } = pageRange(params.pagina);

  let query = supabase
    .from("clients")
    .select(
      "id, nome, cidade, telefone, instagram, interesses, observacoes, ativo",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("nome", { ascending: true })
    .range(from, to);

  if (params.mostrar !== "inativos") {
    query = query.eq("ativo", true);
  }

  if (params.q) {
    const pattern = likePattern(params.q);
    query = query.or(
      `nome.ilike.${pattern},cidade.ilike.${pattern},instagram.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[wata] listClients", error.message);
    throw new Error("Nao foi possivel carregar os clientes.");
  }

  return { rows: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getClient(id: string): Promise<ClientRow | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, nome, cidade, telefone, instagram, interesses, observacoes, ativo",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[wata] getClient", error.message);
    throw new Error("Nao foi possivel carregar o cliente.");
  }

  return data;
}

export type SupplierListParams = ContactListParams & {
  tipo?: Enums<"supplier_relation">;
};

export async function listSuppliers(
  params: SupplierListParams,
): Promise<Paged<SupplierRow>> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { page, from, to } = pageRange(params.pagina);

  let query = supabase
    .from("suppliers")
    .select(
      "id, nome, cidade, telefone, instagram, tipo_relacao, observacoes, ativo",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("nome", { ascending: true })
    .range(from, to);

  if (params.mostrar !== "inativos") {
    query = query.eq("ativo", true);
  }

  if (params.tipo) {
    // BOTH participa dos dois filtros: quem vende e consigna aparece em ambos.
    query =
      params.tipo === "BOTH"
        ? query.eq("tipo_relacao", "BOTH")
        : query.in("tipo_relacao", [params.tipo, "BOTH"]);
  }

  if (params.q) {
    const pattern = likePattern(params.q);
    query = query.or(
      `nome.ilike.${pattern},cidade.ilike.${pattern},instagram.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[wata] listSuppliers", error.message);
    throw new Error("Nao foi possivel carregar os fornecedores.");
  }

  return { rows: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getSupplier(id: string): Promise<SupplierRow | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, nome, cidade, telefone, instagram, tipo_relacao, observacoes, ativo",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[wata] getSupplier", error.message);
    throw new Error("Nao foi possivel carregar o fornecedor.");
  }

  return data;
}

/** Lista curta para selects (origem do relogio, consignante etc.). */
export async function listSupplierOptions(): Promise<
  Array<{ id: string; nome: string; tipo_relacao: Enums<"supplier_relation"> }>
> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, nome, tipo_relacao")
    .is("deleted_at", null)
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("[wata] listSupplierOptions", error.message);
    return [];
  }

  return data ?? [];
}
