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
