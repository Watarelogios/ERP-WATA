import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { pageRange, PAGE_SIZE } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database";

export type TransactionRow = {
  id: string;
  direcao: Enums<"financial_direction">;
  categoria: Enums<"financial_category">;
  valor: number;
  status: Enums<"financial_status">;
  data: string;
  descricao: string | null;
  payout_id: string | null;
  watch: { id: string; wata_id: string; marca: string; modelo: string } | null;
  client: { id: string; nome: string } | null;
};

const SELECT_COLUMNS = `
  id, direcao, categoria, valor, status, data, descricao, payout_id,
  watch:watches ( id, wata_id, marca, modelo ),
  client:clients ( id, nome )
`;

export type TransactionFilters = {
  direcao?: string;
  status?: string;
  de?: string;
  ate?: string;
  pagina?: string;
};

export async function listTransactions(filters: TransactionFilters) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { page, from, to } = pageRange(filters.pagina);

  let query = supabase
    .from("financial_transactions")
    .select(SELECT_COLUMNS, { count: "exact" });

  if (filters.direcao === "INCOME" || filters.direcao === "EXPENSE") {
    query = query.eq("direcao", filters.direcao);
  }

  if (
    filters.status === "CONFIRMED" ||
    filters.status === "PENDING" ||
    filters.status === "REVERSED" ||
    filters.status === "CANCELLED"
  ) {
    query = query.eq("status", filters.status);
  }

  // O filtro de periodo acontece no banco, nao no navegador (Secao 14).
  if (filters.de) {
    query = query.gte("data", filters.de);
  }

  if (filters.ate) {
    query = query.lte("data", filters.ate);
  }

  const { data, error, count } = await query
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[wata] listTransactions", error.message);
    throw new Error("Nao foi possivel carregar o livro caixa.");
  }

  return {
    rows: (data ?? []) as unknown as TransactionRow[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export type PeriodTotals = {
  entradasCents: number;
  saidasCents: number;
  pendentesCents: number;
};

/**
 * Totais do periodo filtrado.
 *
 * Somados no banco e nao sobre a pagina atual: paginar nao pode mudar o total
 * exibido.
 */
export async function getPeriodTotals(
  filters: TransactionFilters,
): Promise<PeriodTotals> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("financial_transactions")
    .select("direcao, valor, status");

  if (filters.direcao === "INCOME" || filters.direcao === "EXPENSE") {
    query = query.eq("direcao", filters.direcao);
  }

  if (filters.de) {
    query = query.gte("data", filters.de);
  }

  if (filters.ate) {
    query = query.lte("data", filters.ate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[wata] getPeriodTotals", error.message);
    return { entradasCents: 0, saidasCents: 0, pendentesCents: 0 };
  }

  let entradasCents = 0;
  let saidasCents = 0;
  let pendentesCents = 0;

  for (const row of data ?? []) {
    const cents = toCents(row.valor);

    if (row.status === "PENDING") {
      pendentesCents += cents;
      continue;
    }

    if (row.status !== "CONFIRMED") {
      continue;
    }

    if (row.direcao === "INCOME") {
      entradasCents += cents;
    } else {
      saidasCents += cents;
    }
  }

  return { entradasCents, saidasCents, pendentesCents };
}
