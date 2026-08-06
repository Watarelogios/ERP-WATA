import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { pageRange, PAGE_SIZE } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types/database";

export type SaleRow = {
  id: string;
  valor_venda: number;
  lucro_bruto: number;
  lucro_liquido: number;
  origem: string | null;
  forma_pagamento: string | null;
  data_venda: string;
  watch: {
    id: string;
    wata_id: string;
    marca: string;
    modelo: string;
    tipo: Enums<"watch_type">;
  } | null;
  client: { id: string; nome: string } | null;
};

const SELECT_COLUMNS = `
  id, valor_venda, lucro_bruto, lucro_liquido, origem, forma_pagamento,
  data_venda,
  watch:watches ( id, wata_id, marca, modelo, tipo ),
  client:clients ( id, nome )
`;

export async function listSales(filters: { q?: string; pagina?: string }) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { page, from, to } = pageRange(filters.pagina);

  const { data, error, count } = await supabase
    .from("sales")
    .select(SELECT_COLUMNS, { count: "exact" })
    .order("data_venda", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[wata] listSales", error.message);
    throw new Error("Nao foi possivel carregar as vendas.");
  }

  return {
    rows: (data ?? []) as unknown as SaleRow[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export type PayoutRow = {
  id: string;
  valor: number;
  status: Enums<"payout_status">;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  supplier: { id: string; nome: string } | null;
  sale: {
    id: string;
    valor_venda: number;
    data_venda: string;
    watch: { id: string; wata_id: string; marca: string; modelo: string } | null;
  } | null;
};

const PAYOUT_COLUMNS = `
  id, valor, status, data_pagamento, forma_pagamento,
  supplier:suppliers ( id, nome ),
  sale:sales ( id, valor_venda, data_venda,
    watch:watches ( id, wata_id, marca, modelo ) )
`;

/**
 * Repasses ao consignante.
 *
 * Pendentes primeiro: sao obrigacao em aberto e aparecem como alerta no
 * dashboard (Secao 14).
 */
export async function listPayouts(status?: Enums<"payout_status">) {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("consignment_payouts").select(PAYOUT_COLUMNS);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[wata] listPayouts", error.message);
    throw new Error("Nao foi possivel carregar os repasses.");
  }

  return (data ?? []) as unknown as PayoutRow[];
}

export type SaleDetail = SaleRow & {
  data_venda: string;
  client_id: string;
  reservation_id: string | null;
  watch_id: string;
  /** Sinal ja recebido: nao entra de novo no caixa ao editar. */
  sinal_cents: number;
  payout: {
    id: string;
    status: Enums<"payout_status">;
    valor: number;
    modalidade: Enums<"consignment_mode"> | null;
  } | null;
};

/**
 * Venda com o que a edicao precisa saber: sinal ja recebido e situacao do
 * repasse, que decidem o que pode ou nao ser alterado.
 */
export async function getSale(id: string): Promise<SaleDetail | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `${SELECT_COLUMNS}, client_id, watch_id, reservation_id,
       reservation:reservations ( valor_sinal ),
       payout:consignment_payouts ( id, status, valor,
         consignment:consignments ( modalidade ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[wata] getSale", error.message);
    throw new Error("Nao foi possivel carregar a venda.");
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as SaleRow & {
    client_id: string;
    watch_id: string;
    reservation_id: string | null;
    reservation: { valor_sinal: number } | null;
    payout: {
      id: string;
      status: Enums<"payout_status">;
      valor: number;
      consignment: { modalidade: Enums<"consignment_mode"> } | null;
    } | null;
  };

  return {
    ...row,
    sinal_cents: toCents(row.reservation?.valor_sinal ?? 0),
    payout: row.payout
      ? {
          id: row.payout.id,
          status: row.payout.status,
          valor: row.payout.valor,
          modalidade: row.payout.consignment?.modalidade ?? null,
        }
      : null,
  };
}
