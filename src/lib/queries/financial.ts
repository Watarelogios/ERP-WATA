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

export type InstallmentItem = {
  id: string;
  numero: number;
  valorCents: number;
  /** Vencimento combinado, preservado mesmo depois do pagamento. */
  vencimento: string;
  paga: boolean;
  /** Data em que a parcela foi efetivamente paga. */
  dataPagamento: string | null;
};

export type InstallmentPlan = {
  parcelamentoId: string;
  /** Descricao sem o prefixo "Parcela i/N", que se repete em todas. */
  descricao: string;
  total: number;
  pagas: number;
  totalCents: number;
  pendenteCents: number;
  /** Vencimento da proxima parcela em aberto. */
  proximoVencimento: string | null;
  /** Todas as parcelas, em ordem, para editar qualquer uma delas. */
  parcelas: InstallmentItem[];
};

/**
 * Compras parceladas, com todas as parcelas de cada uma.
 *
 * Agrupa por parcelamento para a tela mostrar "2 de 5 pagas" em vez de cinco
 * linhas soltas. As quitadas continuam na lista: sem elas, desfazer um
 * pagamento marcado por engano exigiria caçar a linha no extrato.
 */
export async function listInstallmentPlans(): Promise<InstallmentPlan[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select(
      "id, valor, status, data, descricao, parcelamento_id, parcela_numero, parcela_total, parcela_vencimento",
    )
    .not("parcelamento_id", "is", null)
    .order("parcela_numero", { ascending: true });

  if (error) {
    console.error("[wata] listInstallmentPlans", error.message);
    return [];
  }

  const grupos = new Map<string, InstallmentPlan>();

  for (const row of data ?? []) {
    const grupoId = String(row.parcelamento_id);
    const cents = toCents(row.valor);
    const paga = row.status === "CONFIRMED";

    let plano = grupos.get(grupoId);

    if (!plano) {
      plano = {
        parcelamentoId: grupoId,
        // "Parcela 1/5 - Tag Heuer ref X" -> "Tag Heuer ref X"
        descricao: (row.descricao ?? "").replace(/^Parcela \d+\/\d+ - /, ""),
        total: Number(row.parcela_total ?? 0),
        pagas: 0,
        totalCents: 0,
        pendenteCents: 0,
        proximoVencimento: null,
        parcelas: [],
      };
      grupos.set(grupoId, plano);
    }

    plano.totalCents += cents;

    plano.parcelas.push({
      id: String(row.id),
      numero: Number(row.parcela_numero ?? 0),
      valorCents: cents,
      // Parcelas criadas antes da coluna propria caem na data do lancamento.
      vencimento: String(row.parcela_vencimento ?? row.data),
      paga,
      dataPagamento: paga ? String(row.data) : null,
    });

    if (paga) {
      plano.pagas += 1;
    } else if (row.status === "PENDING") {
      plano.pendenteCents += cents;

      // As linhas vem ordenadas por numero: a primeira pendente e a proxima.
      plano.proximoVencimento ??= String(row.parcela_vencimento ?? row.data);
    }
  }

  /*
   * Em aberto primeiro, pela parcela que vence antes. As quitadas vao para o
   * fim: continuam acessiveis sem competir com o que ainda precisa ser pago.
   */
  return [...grupos.values()].sort((a, b) => {
    if (a.proximoVencimento === null || b.proximoVencimento === null) {
      if (a.proximoVencimento !== b.proximoVencimento) {
        return a.proximoVencimento === null ? 1 : -1;
      }

      return a.descricao.localeCompare(b.descricao);
    }

    return a.proximoVencimento.localeCompare(b.proximoVencimento);
  });
}
