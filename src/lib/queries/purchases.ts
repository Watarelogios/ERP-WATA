import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { pageRange, PAGE_SIZE } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database";

export type OpportunityRow = {
  id: string;
  modelo: string;
  referencia: string | null;
  cidade: string | null;
  valor_pedido: number | null;
  minha_oferta: number | null;
  valor_fechado: number | null;
  status: Enums<"purchase_status">;
  notas: string | null;
  data_contato: string;
  data_fechamento: string | null;
  supplier_id: string | null;
  purchased_watch_id: string | null;
  supplier: { id: string; nome: string } | null;
  watch: { id: string; wata_id: string } | null;
};

const SELECT_COLUMNS = `
  id, modelo, referencia, cidade, valor_pedido, minha_oferta, valor_fechado,
  status, notas, data_contato, data_fechamento, supplier_id, purchased_watch_id,
  supplier:suppliers ( id, nome ),
  watch:watches!purchase_opportunities_purchased_watch_id_fkey ( id, wata_id )
`;

export type OpportunityFilters = {
  q?: string;
  status?: string;
  pagina?: string;
};

/**
 * Lista de oportunidades.
 *
 * A busca acontece no banco (ilike sobre modelo e referencia); a tela nunca
 * carrega a base inteira para filtrar no navegador (Secao 14).
 */
export async function listOpportunities(filters: OpportunityFilters) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { page, from, to } = pageRange(filters.pagina);

  let query = supabase
    .from("purchase_opportunities")
    .select(SELECT_COLUMNS, { count: "exact" });

  if (filters.q?.trim()) {
    const termo = `%${filters.q.trim()}%`;
    query = query.or(`modelo.ilike.${termo},referencia.ilike.${termo}`);
  }

  if (
    filters.status === "NEGOTIATING" ||
    filters.status === "PURCHASED" ||
    filters.status === "LOST"
  ) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query
    // Negociacoes abertas primeiro; dentro delas, o contato mais recente.
    .order("status", { ascending: true })
    .order("data_contato", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[wata] listOpportunities", error.message);
    throw new Error("Nao foi possivel carregar as oportunidades.");
  }

  return {
    rows: (data ?? []) as unknown as OpportunityRow[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getOpportunity(id: string): Promise<OpportunityRow | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("purchase_opportunities")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[wata] getOpportunity", error.message);
    throw new Error("Nao foi possivel carregar a oportunidade.");
  }

  return (data as unknown as OpportunityRow) ?? null;
}

/** Contagem por status, para os filtros da tela. */
export async function countOpportunitiesByStatus() {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("purchase_opportunities")
    .select("status");

  if (error) {
    console.error("[wata] countOpportunitiesByStatus", error.message);
    return { NEGOTIATING: 0, PURCHASED: 0, LOST: 0 };
  }

  const counts = { NEGOTIATING: 0, PURCHASED: 0, LOST: 0 };

  for (const row of data ?? []) {
    counts[row.status] += 1;
  }

  return counts;
}
