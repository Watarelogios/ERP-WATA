import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { pageRange, PAGE_SIZE } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database";

export type ReservationRow = {
  id: string;
  valor_combinado: number;
  valor_sinal: number;
  saldo_restante: number;
  validade: string;
  status: Enums<"reservation_status">;
  destino_sinal: Enums<"deposit_fate"> | null;
  data_sinal: string | null;
  forma_pagamento: string | null;
  created_at: string;
  watch: {
    id: string;
    wata_id: string;
    marca: string;
    modelo: string;
    status: Enums<"watch_status">;
  } | null;
  client: { id: string; nome: string } | null;
};

const SELECT_COLUMNS = `
  id, valor_combinado, valor_sinal, saldo_restante, validade, status,
  destino_sinal, data_sinal, forma_pagamento, created_at,
  watch:watches ( id, wata_id, marca, modelo, status ),
  client:clients ( id, nome )
`;

export type ReservationFilters = {
  status?: string;
  pagina?: string;
};

/** Dias de antecedencia para considerar uma reserva "a vencer". */
export const DIAS_A_VENCER = 3;

export async function listReservations(filters: ReservationFilters) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { page, from, to } = pageRange(filters.pagina);

  let query = supabase
    .from("reservations")
    .select(SELECT_COLUMNS, { count: "exact" });

  if (filters.status === "ACTIVE") {
    query = query.eq("status", "ACTIVE");
  } else if (filters.status === "HISTORICO") {
    query = query.neq("status", "ACTIVE");
  }

  const { data, error, count } = await query
    // Ativas primeiro; dentro delas, a que vence antes.
    .order("status", { ascending: true })
    .order("validade", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[wata] listReservations", error.message);
    throw new Error("Nao foi possivel carregar as reservas.");
  }

  return {
    rows: (data ?? []) as unknown as ReservationRow[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getReservation(
  id: string,
): Promise<ReservationRow | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[wata] getReservation", error.message);
    throw new Error("Nao foi possivel carregar a reserva.");
  }

  return (data as unknown as ReservationRow) ?? null;
}

/** Reserva ativa de um relogio, se houver. */
export async function getActiveReservationForWatch(
  watchId: string,
): Promise<ReservationRow | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT_COLUMNS)
    .eq("watch_id", watchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) {
    console.error("[wata] getActiveReservationForWatch", error.message);
    return null;
  }

  return (data as unknown as ReservationRow) ?? null;
}

export async function countReservations() {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("status, validade");

  if (error) {
    console.error("[wata] countReservations", error.message);
    return { ativas: 0, aVencer: 0, historico: 0 };
  }

  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_A_VENCER);
  const limiteIso = limite.toISOString().slice(0, 10);

  let ativas = 0;
  let aVencer = 0;
  let historico = 0;

  for (const row of data ?? []) {
    if (row.status === "ACTIVE") {
      ativas += 1;
      if (row.validade <= limiteIso) {
        aVencer += 1;
      }
    } else {
      historico += 1;
    }
  }

  return { ativas, aVencer, historico };
}
