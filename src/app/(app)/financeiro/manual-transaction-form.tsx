"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  createManualTransactionAction,
  type ManualTransactionFormState,
} from "@/lib/actions/financial";

const INITIAL_STATE: ManualTransactionFormState = {};

/**
 * Categorias permitidas no lancamento avulso.
 *
 * Venda, sinal, compra e repasse ficam de fora: nascem das operacoes, com
 * vinculo e chave de idempotencia. Criar essas categorias a mao permitiria
 * caixa e estoque divergirem.
 */
const CATEGORIAS = {
  INCOME: [{ value: "OTHER_INCOME", label: "Outras entradas" }],
  EXPENSE: [
    { value: "META_ADS", label: "Meta Ads" },
    { value: "SHIPPING", label: "Envio" },
    { value: "SERVICE", label: "Servico" },
    { value: "STRAP", label: "Pulseira" },
    { value: "PACKAGING", label: "Embalagem" },
    { value: "OTHER_EXPENSE", label: "Outras saidas" },
  ],
} as const;

export function ManualTransactionForm({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [direcao, setDirecao] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [state, action, pending] = useActionState(
    createManualTransactionAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  const concluido = Boolean(state.success);
  const visivel = aberto && !concluido;

  const mensagem = concluido ? state.message : undefined;
  useEffect(() => {
    if (mensagem) {
      showToast("success", mensagem);
    }
  }, [mensagem, showToast]);

  const valorError = state.errors?.valor?.[0];

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Novo lancamento
      </Button>

      {visivel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-graphite-dark/40"
            onClick={() => !pending && setAberto(false)}
            aria-label="Fechar"
            tabIndex={-1}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lancamento-titulo"
            className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
          >
            <h2 id="lancamento-titulo" className="text-base font-semibold">
              Novo lancamento
            </h2>
            <p className="mt-1 text-sm text-muted">
              Para movimentos que nao vem de uma compra, venda ou reserva.
            </p>

            <form action={action} className="mt-4 space-y-4">
              {state.message && !state.success ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="direcao" label="Tipo">
                  <Select
                    name="direcao"
                    value={direcao}
                    onChange={(event) =>
                      setDirecao(event.target.value as "INCOME" | "EXPENSE")
                    }
                  >
                    <option value="EXPENSE">Saida</option>
                    <option value="INCOME">Entrada</option>
                  </Select>
                </Field>

                <Field id="categoria" label="Categoria">
                  {/* A lista muda com o tipo: categoria de saida nao vira entrada. */}
                  <Select name="categoria" key={direcao}>
                    {CATEGORIAS[direcao].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="valor" label="Valor" error={valorError} required>
                  <MoneyInput
                    name="valor"
                    {...fieldAria("valor", { error: valorError })}
                  />
                </Field>

                <Field id="data" label="Data">
                  <Input
                    name="data"
                    type="date"
                    defaultValue={hoje}
                    {...fieldAria("data", {})}
                  />
                </Field>
              </div>

              <Field id="descricao" label="Descricao">
                <Input
                  name="descricao"
                  maxLength={300}
                  placeholder="Ex.: campanha de alcance de maio"
                  {...fieldAria("descricao", {})}
                />
              </Field>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>

                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner label="Registrando" /> : null}
                  {pending ? "Registrando..." : "Registrar lancamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
