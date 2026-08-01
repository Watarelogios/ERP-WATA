"use client";

import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  cancelReservationAction,
  type CancelReservationFormState,
} from "@/lib/actions/reservations";
import { DEPOSIT_FATE, toOptions } from "@/lib/labels";
import { formatBRL } from "@/lib/money";

const INITIAL_STATE: CancelReservationFormState = {};

/** Efeito de cada destino no caixa, explicado antes da escolha. */
const EFEITO_NO_CAIXA: Record<string, (sinal: string) => string> = {
  REFUNDED: (sinal) => `O caixa diminui ${sinal}: uma saida confirmada e criada.`,
  RETAINED: () =>
    "O caixa nao muda: o valor ja recebido passa a ser receita de sinal retido.",
  CUSTOMER_CREDIT: (sinal) =>
    `O caixa nao muda: ${sinal} viram credito do cliente para uma compra futura.`,
};

export type CancelReservationDialogProps = {
  reservationId: string;
  /** Sinal em centavos; zero significa reserva sem sinal. */
  valorSinalCents: number;
  subject: string;
  onDone?: () => void;
};

export function CancelReservationDialog({
  reservationId,
  valorSinalCents,
  subject,
  onDone,
}: CancelReservationDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState("");
  const [state, action, pending] = useActionState(
    cancelReservationAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  const temSinal = valorSinalCents > 0;
  const sinalFormatado = formatBRL(valorSinalCents);
  const destinoError = state.errors?.destino_sinal?.[0];

  /*
   * O dialogo some assim que a acao conclui — derivado do estado, e nao por
   * setState em efeito, que provoca renderizacao em cascata.
   */
  const concluido = Boolean(state.success);
  const visivel = aberto && !concluido;

  const mensagemSucesso = concluido ? (state.message ?? "Reserva encerrada.") : undefined;

  useEffect(() => {
    if (mensagemSucesso) {
      showToast("success", mensagemSucesso);
      onDone?.();
    }
  }, [mensagemSucesso, showToast, onDone]);

  return (
    <>
      <Button variant="secondary" onClick={() => setAberto(true)}>
        Cancelar reserva
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
            aria-labelledby="cancelar-reserva-titulo"
            className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
          >
            <h2 id="cancelar-reserva-titulo" className="text-base font-semibold">
              Encerrar reserva
            </h2>
            <p className="mt-1 text-sm font-medium text-graphite-dark">
              {subject}
            </p>
            <p className="mt-2 text-sm text-muted">
              O relogio volta a ficar disponivel para venda.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input
                type="hidden"
                name="reservation_id"
                value={reservationId}
              />
              <input
                type="hidden"
                name="tem_sinal"
                value={temSinal ? "1" : "0"}
              />

              {state.message && !state.success ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <Field id="status" label="Motivo do encerramento">
                <Select name="status" defaultValue="CANCELLED">
                  <option value="CANCELLED">Cancelada</option>
                  <option value="EXPIRED">Vencida</option>
                </Select>
              </Field>

              {temSinal ? (
                <Field
                  id="destino_sinal"
                  label={`Destino do sinal de ${sinalFormatado}`}
                  error={destinoError}
                  required
                >
                  <Select
                    name="destino_sinal"
                    value={destino}
                    onChange={(event) => setDestino(event.target.value)}
                    {...fieldAria("destino_sinal", { error: destinoError })}
                  >
                    <option value="">Selecione...</option>
                    {toOptions(DEPOSIT_FATE).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {/* A consequencia financeira aparece antes de confirmar. */}
              {temSinal && destino ? (
                <Alert tone="info">
                  {EFEITO_NO_CAIXA[destino]?.(sinalFormatado)}
                </Alert>
              ) : null}

              <Field id="motivo" label="Observacao">
                <Textarea
                  name="motivo"
                  rows={2}
                  maxLength={300}
                  placeholder="Registrado no historico do relogio."
                  {...fieldAria("motivo", {})}
                />
              </Field>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                >
                  Voltar
                </Button>

                <Button type="submit" variant="danger" disabled={pending}>
                  {pending ? <Spinner label="Encerrando" /> : null}
                  {pending ? "Encerrando..." : "Encerrar reserva"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
