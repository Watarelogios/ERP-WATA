"use client";

import { Undo2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  reverseTransactionAction,
  type ReverseTransactionFormState,
} from "@/lib/actions/financial";
import { formatBRL } from "@/lib/money";

const INITIAL_STATE: ReverseTransactionFormState = {};

export type ReverseTransactionButtonProps = {
  transactionId: string;
  descricao: string;
  valorCents: number;
  entrada: boolean;
};

export function ReverseTransactionButton({
  transactionId,
  descricao,
  valorCents,
  entrada,
}: ReverseTransactionButtonProps) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(
    reverseTransactionAction,
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

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAberto(true)}
        aria-label={`Estornar ${descricao}`}
      >
        <Undo2 className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Estornar</span>
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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="estorno-titulo"
            className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
          >
            <h2 id="estorno-titulo" className="text-base font-semibold">
              Estornar lancamento
            </h2>
            <p className="mt-1 text-sm font-medium text-graphite-dark">
              {descricao}
            </p>
            <p className="mt-2 text-sm text-muted">
              O lancamento continua no extrato marcado como estornado e deixa de
              contar no caixa. O saldo{" "}
              {entrada ? "diminui" : "aumenta"} {formatBRL(valorCents)}.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input
                type="hidden"
                name="transaction_id"
                value={transactionId}
              />

              {state.message && !state.success ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <Field id="motivo" label="Motivo do estorno">
                <Input
                  name="motivo"
                  maxLength={300}
                  placeholder="Ex.: lancamento duplicado"
                  {...fieldAria("motivo", {})}
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

                <Button type="submit" variant="danger" disabled={pending}>
                  {pending ? <Spinner label="Estornando" /> : null}
                  {pending ? "Estornando..." : "Estornar lancamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
