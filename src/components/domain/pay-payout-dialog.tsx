"use client";

import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { payPayoutAction, type PayPayoutFormState } from "@/lib/actions/sales";
import { formatBRL } from "@/lib/money";

const INITIAL_STATE: PayPayoutFormState = {};

export type PayPayoutDialogProps = {
  payoutId: string;
  valorCents: number;
  supplierNome: string;
  watchLabel: string;
  caixaAtualCents: number;
  hoje: string;
};

export function PayPayoutDialog({
  payoutId,
  valorCents,
  supplierNome,
  watchLabel,
  caixaAtualCents,
  hoje,
}: PayPayoutDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(
    payPayoutAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  // Fechamento derivado do estado, sem setState em efeito.
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
      <Button onClick={() => setAberto(true)}>Pagar repasse</Button>

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
            aria-labelledby="pagar-repasse-titulo"
            className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
          >
            <h2 id="pagar-repasse-titulo" className="text-base font-semibold">
              Pagar repasse
            </h2>
            <p className="mt-1 text-sm font-medium text-graphite-dark">
              {supplierNome}
            </p>
            <p className="mt-2 text-sm text-muted">
              Referente a {watchLabel}. Uma saida confirmada e lancada no caixa.
            </p>

            <dl className="mt-4 space-y-1.5 rounded-md bg-surface p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Valor do repasse</dt>
                <dd className="font-medium tabular-nums" data-money>
                  {formatBRL(valorCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Caixa atual</dt>
                <dd className="tabular-nums" data-money>
                  {formatBRL(caixaAtualCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt className="text-muted">Caixa apos o pagamento</dt>
                <dd className="font-medium tabular-nums" data-money>
                  {formatBRL(caixaAtualCents - valorCents)}
                </dd>
              </div>
            </dl>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="payout_id" value={payoutId} />

              {state.message && !state.success ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="data_pagamento" label="Data do pagamento">
                  <Input
                    name="data_pagamento"
                    type="date"
                    defaultValue={hoje}
                    {...fieldAria("data_pagamento", {})}
                  />
                </Field>

                <Field id="forma_pagamento" label="Forma de pagamento">
                  <Input
                    name="forma_pagamento"
                    placeholder="Ex.: PIX"
                    maxLength={60}
                    {...fieldAria("forma_pagamento", {})}
                  />
                </Field>
              </div>

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
                  {pending ? "Registrando..." : "Pagar repasse"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
