/**
 * Acesso centralizado as variaveis de ambiente.
 *
 * As referencias a `process.env.NEXT_PUBLIC_*` sao estaticas de proposito:
 * o Next.js so consegue substituir o valor no bundle do cliente dessa forma.
 *
 * SUPABASE_SERVICE_ROLE_KEY nunca aparece aqui — ela e lida apenas em modulos
 * server-only, e o fluxo normal do sistema opera com a sessao do usuario + RLS.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/*
 * A especificacao adota NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (nomenclatura
 * atual do Supabase). Projetos criados antes dessa mudanca ainda expoem a
 * chave como anon key, entao ela e aceita como alternativa.
 */
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MISSING_ENV_MESSAGE =
  "Configuracao do Supabase ausente. Copie .env.example para .env.local e preencha " +
  "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

export type SupabaseEnv = {
  url: string;
  key: string;
};

/** Retorna a configuracao publica do Supabase ou lanca erro descritivo. */
export function getSupabaseEnv(): SupabaseEnv {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return { url: supabaseUrl, key: supabaseKey };
}

/** Permite degradar a UI com aviso em vez de quebrar quando falta configuracao. */
export function hasSupabaseEnv(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

/** Fuso usado para exibicao de datas; a persistencia continua em timestamptz. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Recife";
