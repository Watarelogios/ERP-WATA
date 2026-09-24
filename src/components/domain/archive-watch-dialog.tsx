"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { archiveWatchAction } from "@/lib/actions/watches";
import type { FormState } from "@/lib/actions/form-state";

const INITIAL_STATE: FormState = {};

export type ArchiveWatchDialogProps = {
  watchId: string;
  /** Identificacao do relogio, para a pessoa conferir antes de confirmar. */
  subject: string;
  /** Lancamentos ja no caixa ligados a este relogio. */
  lancamentos: number;
};

/**
 * Exclui um relogio cadastrado por engano.
 *
 * Com dialogo de confirmacao, ao contrario de pagar uma parcela: some da lista,
 * nao ha botao de desfazer na tela e o clique pode ser acidental — o botao fica
 * ao lado de "Editar cadastro".
 */
export function ArchiveWatchDialog({
  watchId,
  subject,
  lancamentos,
}: ArchiveWatchDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(
    archiveWatchAction,
    INITIAL_STATE,
  );

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setAberto(true)}
        className="w-full text-danger hover:bg-danger-surface"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Excluir relogio
      </Button>

      {aberto ? (
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
            aria-labelledby="excluir-titulo"
            className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
          >
            <h2 id="excluir-titulo" className="text-base font-semibold">
              Excluir relogio
            </h2>
            <p className="mt-1 text-sm font-medium text-graphite-dark">
              {subject}
            </p>
            <p className="mt-2 text-sm text-muted">
              Ele sai do estoque, do dashboard e dos relatorios. Use quando o
              cadastro foi um engano.
            </p>

            {/*
              Excluir o relogio nao mexe no caixa: dizer isso aqui evita a
              descoberta depois, olhando um saldo que nao fecha.
            */}
            {lancamentos > 0 ? (
              <Alert tone="warning" className="mt-3">
                Este relogio tem {lancamentos}{" "}
                {lancamentos === 1 ? "lancamento" : "lancamentos"} no caixa. A
                exclusao nao os apaga. Se tambem foram engano, estorne cada um
                no Financeiro.
              </Alert>
            ) : null}

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="watch_id" value={watchId} />

              {state.message ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>

                <Button type="submit" variant="danger" disabled={pending}>
                  {pending ? <Spinner label="Excluindo" /> : null}
                  {pending ? "Excluindo..." : "Excluir relogio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
