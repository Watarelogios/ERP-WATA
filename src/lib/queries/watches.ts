import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { PAGE_SIZE, pageRange } from "@/lib/queries/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/types/database";

export type WatchListRow = Pick<
  Tables<"watches">,
  | "id"
  | "wata_id"
  | "marca"
  | "modelo"
  | "referencia"
  | "tipo"
  | "status"
  | "valor_compra"
  | "valor_minimo"
  | "valor_anunciado"
  | "valor_vendido"
  | "data_entrada"
> & {
  supplier: { nome: string } | null;
  /** Caminho da foto de capa no Storage, quando existir. */
  cover_path: string | null;
};

export type WatchDetail = Tables<"watches"> & {
  supplier: { id: string; nome: string } | null;
  photos: Array<
    Pick<
      Tables<"watch_photos">,
      "id" | "storage_path" | "ordem" | "is_cover" | "alt_text"
    >
  >;
  consignment: Pick<
    Tables<"consignments">,
    | "id"
    | "supplier_id"
    | "modalidade"
    | "valor_repasse_fixo"
    | "percentual_wata"
    | "prazo"
  > | null;
  history: Array<
    Pick<
      Tables<"watch_status_history">,
      "id" | "status_anterior" | "status_novo" | "motivo" | "created_at"
    >
  >;
};

export type WatchListParams = {
  q?: string;
  status?: Enums<"watch_status">;
  tipo?: Enums<"watch_type">;
  marca?: string;
  fornecedor?: string;
  ordem?: string;
  pagina?: string;
};

export type WatchListResult = {
  rows: WatchListRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Marcas existentes, para montar o filtro. */
  marcas: string[];
};

const SORTS: Record<
  string,
  { column: string; ascending: boolean }
> = {
  entrada: { column: "data_entrada", ascending: false },
  "entrada-asc": { column: "data_entrada", ascending: true },
  preco: { column: "valor_anunciado", ascending: false },
  "preco-asc": { column: "valor_anunciado", ascending: true },
  marca: { column: "marca", ascending: true },
  "marca-desc": { column: "marca", ascending: false },
};

function likePattern(term: string): string {
  return `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
}

export async function listWatches(
  params: WatchListParams,
): Promise<WatchListResult> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { page, from, to } = pageRange(params.pagina);

  const sort = SORTS[params.ordem ?? ""] ?? SORTS.entrada;

  let query = supabase
    .from("watches")
    .select(
      `id, wata_id, marca, modelo, referencia, tipo, status,
       valor_compra, valor_minimo, valor_anunciado, valor_vendido, data_entrada,
       supplier:suppliers ( nome ),
       photos:watch_photos ( storage_path, is_cover, ordem )`,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order(sort.column, { ascending: sort.ascending })
    // Desempate estavel para paginacao.
    .order("wata_id", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.tipo) {
    query = query.eq("tipo", params.tipo);
  }

  if (params.marca) {
    query = query.eq("marca", params.marca);
  }

  if (params.fornecedor) {
    query = query.eq("supplier_id", params.fornecedor);
  }

  if (params.q) {
    const pattern = likePattern(params.q);
    query = query.or(
      `wata_id.ilike.${pattern},marca.ilike.${pattern},modelo.ilike.${pattern},referencia.ilike.${pattern}`,
    );
  }

  const [{ data, count, error }, marcasResult] = await Promise.all([
    query,
    supabase
      .from("watches")
      .select("marca")
      .is("deleted_at", null)
      .order("marca"),
  ]);

  if (error) {
    console.error("[wata] listWatches", error.message);
    throw new Error("Nao foi possivel carregar o estoque.");
  }

  const marcas = Array.from(
    new Set((marcasResult.data ?? []).map((row) => row.marca)),
  );

  const rows: WatchListRow[] = (data ?? []).map((row) => {
    const photos = [...(row.photos ?? [])].sort(
      (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.ordem - b.ordem,
    );

    return {
      id: row.id,
      wata_id: row.wata_id,
      marca: row.marca,
      modelo: row.modelo,
      referencia: row.referencia,
      tipo: row.tipo,
      status: row.status,
      valor_compra: row.valor_compra,
      valor_minimo: row.valor_minimo,
      valor_anunciado: row.valor_anunciado,
      valor_vendido: row.valor_vendido,
      data_entrada: row.data_entrada,
      supplier: row.supplier,
      cover_path: photos[0]?.storage_path ?? null,
    };
  });

  return { rows, total: count ?? 0, page, pageSize: PAGE_SIZE, marcas };
}

export async function getWatch(id: string): Promise<WatchDetail | null> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("watches")
    .select(
      `*,
       supplier:suppliers ( id, nome ),
       photos:watch_photos ( id, storage_path, ordem, is_cover, alt_text ),
       consignments ( id, supplier_id, modalidade, valor_repasse_fixo, percentual_wata, prazo, encerrado_em, created_at ),
       history:watch_status_history ( id, status_anterior, status_novo, motivo, created_at )`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[wata] getWatch", error.message);
    throw new Error("Nao foi possivel carregar o relogio.");
  }

  if (!data) {
    return null;
  }

  const { consignments, photos, history, ...watch } = data;

  const activeConsignment =
    (consignments ?? [])
      .filter((item) => item.encerrado_em === null)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  return {
    ...watch,
    photos: [...(photos ?? [])].sort((a, b) => a.ordem - b.ordem),
    history: [...(history ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
    consignment: activeConsignment
      ? {
          id: activeConsignment.id,
          supplier_id: activeConsignment.supplier_id,
          modalidade: activeConsignment.modalidade,
          valor_repasse_fixo: activeConsignment.valor_repasse_fixo,
          percentual_wata: activeConsignment.percentual_wata,
          prazo: activeConsignment.prazo,
        }
      : null,
  };
}

/**
 * A compra deste relogio ja foi lancada no caixa?
 *
 * Decide se a tela de edicao oferece o lancamento ou apenas informa que ele ja
 * aconteceu — um checkbox sem esse contexto nao diz se a acao ja foi feita.
 */
export async function isPurchaseRegistered(watchId: string): Promise<boolean> {
  await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("watch_id", watchId)
    .eq("categoria", "PURCHASE")
    .eq("status", "CONFIRMED")
    .limit(1);

  if (error) {
    console.error("[wata] isPurchaseRegistered", error.message);
    return false;
  }

  return (data ?? []).length > 0;
}
