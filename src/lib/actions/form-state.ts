/**
 * Estado compartilhado dos formularios que usam `useActionState`.
 *
 * `errors` guarda mensagens por campo (exibidas junto ao input) e `message`
 * guarda a falha geral da operacao. Erros tecnicos do PostgreSQL ou do Supabase
 * nunca chegam aqui: sao registrados no servidor e traduzidos antes.
 */
export type FormState<TField extends string = string> = {
  message?: string;
  errors?: Partial<Record<TField, string[]>>;
  success?: boolean;
};

export const initialFormState: FormState = {};

/**
 * Registra o erro real no servidor e devolve uma mensagem utilizavel.
 *
 * O usuario precisa saber o que fazer, nao ler um stack trace.
 */
export function reportUnexpectedError(
  context: string,
  error: unknown,
  message = "Nao foi possivel concluir a operacao. Tente novamente.",
): FormState {
  console.error(`[wata] ${context}`, error);

  return { message };
}
