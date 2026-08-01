import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardSummary = {
  capitalInvestidoCents: number;
  valorEstoqueCents: number;
  lucroPotencialProprioCents: number;
  lucroMinimoProprioCents: number;
  lucroRealizadoCents: number;
  caixaCents: number;
  totalDisponivel: number;
  totalReservado: number;
  totalVendido: number;
  repassesPendentes: number;
};

const ZERO: DashboardSummary = {
  capitalInvestidoCents: 0,
  valorEstoqueCents: 0,
  lucroPotencialProprioCents: 0,
  lucroMinimoProprioCents: 0,
  lucroRealizadoCents: 0,
  caixaCents: 0,
  totalDisponivel: 0,
  totalReservado: 0,
  totalVendido: 0,
  repassesPendentes: 0,
};

/**
 * Indicadores da view `dashboard_summary` (Secao 14).
 *
 * Nenhum total e mantido manualmente: a view recalcula a partir dos dados. O
 * RLS garante que a linha devolvida e a do usuario corrente.
 */
export const getDashboardSummary = cache(
  async (): Promise<DashboardSummary> => {
    await requireUser();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("dashboard_summary")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[wata] getDashboardSummary", error.message);
      throw new Error("Nao foi possivel carregar os indicadores.");
    }

    if (!data) {
      return ZERO;
    }

    return {
      capitalInvestidoCents: toCents(data.capital_investido),
      valorEstoqueCents: toCents(data.valor_estoque),
      lucroPotencialProprioCents: toCents(data.lucro_potencial_proprio),
      lucroMinimoProprioCents: toCents(data.lucro_minimo_proprio),
      lucroRealizadoCents: toCents(data.lucro_realizado),
      caixaCents: toCents(data.caixa),
      totalDisponivel: Number(data.total_disponivel ?? 0),
      totalReservado: Number(data.total_reservado ?? 0),
      totalVendido: Number(data.total_vendido ?? 0),
      repassesPendentes: Number(data.repasses_pendentes ?? 0),
    };
  },
);

export type MonthlyRow = {
  mes: string;
  quantidade: number;
  receitaCents: number;
  lucroCents: number;
};

/** Vendas, receita e lucro por mes (view monthly_sales_profit). */
export async function getMonthlySalesProfit(
  meses = 6,
): Promise<MonthlyRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_sales_profit")
    .select("mes, quantidade, receita, lucro")
    .order("mes", { ascending: false })
    .limit(meses);

  if (error) {
    console.error("[wata] getMonthlySalesProfit", error.message);
    return [];
  }

  // Devolve em ordem cronologica para o grafico ler da esquerda para a direita.
  return (data ?? [])
    .map((row) => ({
      mes: String(row.mes),
      quantidade: Number(row.quantidade ?? 0),
      receitaCents: toCents(row.receita),
      lucroCents: toCents(row.lucro),
    }))
    .reverse();
}

export type OriginRow = { origem: string; quantidade: number; valorCents: number };

/** Quantidade e valor por canal de venda (view sales_by_origin). */
export async function getSalesByOrigin(): Promise<OriginRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sales_by_origin")
    .select("origem, quantidade, valor")
    .order("valor", { ascending: false });

  if (error) {
    console.error("[wata] getSalesByOrigin", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    origem: String(row.origem),
    quantidade: Number(row.quantidade ?? 0),
    valorCents: toCents(row.valor),
  }));
}

export type AlertRow = {
  tipo: string;
  referenciaId: string;
  dataReferencia: string | null;
  diasRestantes: number | null;
  valorCents: number;
};

/** Reservas a vencer, consignacoes no prazo e repasses pendentes. */
export async function getActiveAlerts(): Promise<AlertRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("active_alerts")
    .select("tipo, referencia_id, data_referencia, dias_restantes, valor");

  if (error) {
    console.error("[wata] getActiveAlerts", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      tipo: String(row.tipo),
      referenciaId: String(row.referencia_id),
      dataReferencia: row.data_referencia ? String(row.data_referencia) : null,
      diasRestantes:
        row.dias_restantes === null ? null : Number(row.dias_restantes),
      valorCents: toCents(row.valor),
    }))
    // Mais urgente primeiro; sem prazo (repasses) por ultimo.
    .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
}

export type StockAgingRow = {
  watchId: string;
  wataId: string;
  marca: string;
  modelo: string;
  diasEmEstoque: number;
  valorAnunciadoCents: number;
};

/** Itens parados acima do limite configurado (view stock_aging). */
export async function getStuckStock(limite = 5): Promise<StockAgingRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("stock_aging")
    .select("watch_id, wata_id, marca, modelo, dias_em_estoque, valor_anunciado")
    .eq("parado", true)
    .order("dias_em_estoque", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("[wata] getStuckStock", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    watchId: String(row.watch_id),
    wataId: String(row.wata_id),
    marca: String(row.marca),
    modelo: String(row.modelo),
    diasEmEstoque: Number(row.dias_em_estoque ?? 0),
    valorAnunciadoCents: toCents(row.valor_anunciado),
  }));
}
