import type { PGlite } from "@electric-sql/pglite";

/**
 * Inserts minimos para montar cenarios.
 *
 * Rodam como superusuario (fora do RLS) de proposito: preparar o cenario nao e
 * o que esta sob teste. O isolamento por owner_id e verificado em rls.test.ts,
 * onde as consultas passam por `asUser`.
 */

export async function createSupplier(
  db: PGlite,
  ownerId: string,
  nome = "Fornecedor Teste",
): Promise<string> {
  const result = await db.query<{ id: string }>(
    "insert into public.suppliers (owner_id, nome) values ($1, $2) returning id",
    [ownerId, nome],
  );

  return result.rows[0].id;
}

export async function createClient(
  db: PGlite,
  ownerId: string,
  nome = "Cliente Teste",
): Promise<string> {
  const result = await db.query<{ id: string }>(
    "insert into public.clients (owner_id, nome) values ($1, $2) returning id",
    [ownerId, nome],
  );

  return result.rows[0].id;
}

export type WatchInput = {
  tipo?: "OWNED" | "CONSIGNED";
  valorCompra?: number | null;
  valorAnunciado?: number | null;
  valorMinimo?: number | null;
  marca?: string;
  modelo?: string;
  /**
   * Dias desde a entrada em estoque.
   *
   * A data e calculada pelo proprio banco (`current_date - N`); montar a data
   * em JavaScript introduziria erro de um dia por diferenca de fuso.
   */
  diasEmEstoque?: number;
};

export async function createWatch(
  db: PGlite,
  ownerId: string,
  input: WatchInput = {},
): Promise<{ id: string; wataId: string }> {
  const tipo = input.tipo ?? "OWNED";
  const valorCompra =
    tipo === "OWNED" ? (input.valorCompra ?? 1000) : null;

  const result = await db.query<{ id: string; wata_id: string }>(
    `insert into public.watches
       (owner_id, marca, modelo, tipo, valor_compra, valor_anunciado, valor_minimo, data_entrada)
     values ($1, $2, $3, $4, $5, $6, $7, current_date - $8::integer)
     returning id, wata_id`,
    [
      ownerId,
      input.marca ?? "Seiko",
      input.modelo ?? "SKX007",
      tipo,
      valorCompra,
      input.valorAnunciado ?? 2000,
      input.valorMinimo ?? 1800,
      input.diasEmEstoque ?? 0,
    ],
  );

  return { id: result.rows[0].id, wataId: result.rows[0].wata_id };
}

export async function createConsignment(
  db: PGlite,
  ownerId: string,
  watchId: string,
  supplierId: string,
  mode:
    | { modalidade: "FIXED_PAYOUT"; valorRepasseFixo: number }
    | { modalidade: "WATA_PERCENTAGE"; percentualWata: number },
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.consignments
       (owner_id, watch_id, supplier_id, modalidade, valor_repasse_fixo, percentual_wata)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [
      ownerId,
      watchId,
      supplierId,
      mode.modalidade,
      mode.modalidade === "FIXED_PAYOUT" ? mode.valorRepasseFixo : null,
      mode.modalidade === "WATA_PERCENTAGE" ? mode.percentualWata : null,
    ],
  );

  return result.rows[0].id;
}

export async function createSale(
  db: PGlite,
  ownerId: string,
  watchId: string,
  clientId: string,
  valorVenda: number,
  origem = "Instagram",
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.sales (owner_id, watch_id, client_id, valor_venda, origem)
     values ($1, $2, $3, $4, $5) returning id`,
    [ownerId, watchId, clientId, valorVenda, origem],
  );

  return result.rows[0].id;
}

export async function createExpense(
  db: PGlite,
  ownerId: string,
  input: {
    watchId?: string | null;
    saleId?: string | null;
    categoria?: string;
    valor: number;
    status?: string;
  },
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into public.expenses (owner_id, watch_id, sale_id, categoria, valor, status)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      ownerId,
      input.watchId ?? null,
      input.saleId ?? null,
      input.categoria ?? "SHIPPING",
      input.valor,
      input.status ?? "CONFIRMED",
    ],
  );

  return result.rows[0].id;
}

export async function saleProfit(
  db: PGlite,
  saleId: string,
): Promise<{ bruto: number; liquido: number }> {
  const result = await db.query<{
    lucro_bruto: string;
    lucro_liquido: string;
  }>("select lucro_bruto, lucro_liquido from public.sales where id = $1", [
    saleId,
  ]);

  return {
    bruto: Number(result.rows[0].lucro_bruto),
    liquido: Number(result.rows[0].lucro_liquido),
  };
}
