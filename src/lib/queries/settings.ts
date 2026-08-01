import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Settings = {
  id: string;
  nomeLoja: string;
  logoUrl: string | null;
  /** Em centavos; a conversao acontece na borda, nunca no meio do calculo. */
  saldoInicialCents: number;
  diasEstoqueParado: number;
  canaisVenda: string[];
  categorias: string[];
};

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Configuracao da loja do usuario corrente.
 *
 * Devolve null no primeiro acesso, antes de a loja ser configurada — e o que
 * dispara o fluxo de boas-vindas (Secao 3).
 */
export const getSettings = cache(async (): Promise<Settings | null> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("settings")
    .select(
      "id, nome_loja, logo_url, saldo_inicial, dias_estoque_parado, canais_venda, categorias",
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[wata] getSettings", error.message);
    throw new Error("Nao foi possivel carregar as configuracoes.");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    nomeLoja: data.nome_loja,
    logoUrl: data.logo_url,
    saldoInicialCents: toCents(data.saldo_inicial),
    diasEstoqueParado: data.dias_estoque_parado,
    canaisVenda: asStringList(data.canais_venda),
    categorias: asStringList(data.categorias),
  };
});

/** Canais disponiveis para os selects de origem da venda. */
export async function getSaleChannels(): Promise<string[]> {
  const settings = await getSettings();

  return settings?.canaisVenda ?? [];
}
