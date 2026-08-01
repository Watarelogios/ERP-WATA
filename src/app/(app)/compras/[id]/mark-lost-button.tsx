"use client";

import { XCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { markOpportunityLostAction } from "@/lib/actions/purchases";

export function MarkLostButton({
  opportunityId,
  modelo,
}: {
  opportunityId: string;
  modelo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  return (
    <>
      <Button variant="secondary" onClick={() => setAberto(true)}>
        <XCircle className="size-4" aria-hidden="true" />
        Marcar perdida
      </Button>

      <ConfirmDialog
        open={aberto}
        onClose={() => setAberto(false)}
        onConfirm={() =>
          startTransition(async () => {
            const result = await markOpportunityLostAction(opportunityId);

            setAberto(false);

            if (result?.message) {
              showToast("danger", result.message);
            } else {
              showToast("success", "Negociacao encerrada como perdida.");
            }
          })
        }
        subject={modelo}
        title="Encerrar negociacao"
        description="A oportunidade sai da lista de negociacoes abertas. Nenhum relogio e criado e nada e lancado no caixa."
        confirmLabel="Marcar como perdida"
        pending={pending}
      />
    </>
  );
}
