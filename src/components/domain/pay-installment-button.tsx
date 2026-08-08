"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  payInstallmentAction,
  type PayInstallmentFormState,
} from "@/lib/actions/financial";

const INITIAL_STATE: PayInstallmentFormState = {};

export type PayInstallmentButtonProps = {
  transactionId: string;
  /** Data do pagamento; hoje por padrao, calculada no servidor. */
  hoje: string;
  label: string;
};

/**
 * Marca uma parcela como paga.
 *
 * Sem dialogo de confirmacao: o valor e a parcela ja estao visiveis ao lado do
 * botao, e a acao e reversivel por estorno. Pedir confirmacao a cada parcela
 * atrapalharia o uso repetido.
 */
export function PayInstallmentButton({
  transactionId,
  hoje,
  label,
}: PayInstallmentButtonProps) {
  const [state, action, pending] = useActionState(
    payInstallmentAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  const sucesso = state.success ? state.message : undefined;
  const erro = !state.success ? state.message : undefined;

  useEffect(() => {
    if (sucesso) {
      showToast("success", sucesso);
    }
  }, [sucesso, showToast]);

  useEffect(() => {
    if (erro) {
      showToast("danger", erro);
    }
  }, [erro, showToast]);

  return (
    <form action={action}>
      <input type="hidden" name="transaction_id" value={transactionId} />
      <input type="hidden" name="data_pagamento" value={hoje} />

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Spinner label="Registrando" /> : null}
        {pending ? "..." : label}
      </Button>
    </form>
  );
}
