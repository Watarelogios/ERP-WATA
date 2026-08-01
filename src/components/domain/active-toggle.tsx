"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/actions/form-state";

export type ActiveToggleProps = {
  /** Nome exibido no dialogo de confirmacao. */
  subject: string;
  ativo: boolean;
  /** Server Action que efetiva a mudanca. */
  action: (ativo: boolean) => Promise<FormState>;
  /** O que a inativacao significa neste cadastro. */
  deactivateConsequence: string;
};

/**
 * Inativar/reativar um cadastro (soft delete, Secao 8).
 *
 * Inativar pede confirmacao porque some das listas padrao; reativar e
 * inofensivo e executa direto.
 */
export function ActiveToggle({
  subject,
  ativo,
  action,
  deactivateConsequence,
}: ActiveToggleProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function run(next: boolean) {
    startTransition(async () => {
      const result = await action(next);

      if (result.success) {
        showToast("success", result.message ?? "Feito.");
      } else {
        showToast("danger", result.message ?? "Nao foi possivel concluir.");
      }

      setConfirming(false);
    });
  }

  if (ativo) {
    return (
      <>
        <Button
          variant="secondary"
          onClick={() => setConfirming(true)}
          disabled={pending}
        >
          Inativar
        </Button>

        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={() => run(false)}
          title="Inativar cadastro"
          subject={subject}
          description={deactivateConsequence}
          confirmLabel="Inativar"
          pending={pending}
          destructive
        />
      </>
    );
  }

  return (
    <Button variant="secondary" onClick={() => run(true)} disabled={pending}>
      {pending ? <Spinner label="Reativando" /> : null}
      Reativar
    </Button>
  );
}
