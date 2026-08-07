"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ClientSelect } from "@/components/domain/client-select";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import {
  createReservationAction,
  type CreateReservationFormState,
} from "@/lib/actions/reservations";
import { formatBRL } from "@/lib/money";

const INITIAL_STATE: CreateReservationFormState = {};

const SINAL_DESCRICAO =
  "Opcional. Entra no caixa como entrada confirmada e nao sera cobrado de novo na venda.";

export type ReservationFormProps = {
  watchId: string;
  watchLabel: string;
  valorAnunciadoCents: number | null;
  clients: Array<{ id: string; nome: string }>;
  /** Datas calculadas no servidor: `new Date()` no render seria impuro. */
  hoje: string;
  validadePadrao: string;
};

export function ReservationForm({
  watchId,
  watchLabel,
  valorAnunciadoCents,
  clients,
  hoje,
  validadePadrao,
}: ReservationFormProps) {
  const [state, action, pending] = useActionState(
    createReservationAction,
    INITIAL_STATE,
  );

  const [combinadoCents, setCombinadoCents] = useState<number | null>(
    valorAnunciadoCents,
  );
  const [sinalCents, setSinalCents] = useState<number | null>(null);

  const clientError = state.errors?.client_id?.[0];
  const combinadoError = state.errors?.valor_combinado?.[0];
  const validadeError = state.errors?.validade?.[0];
  const sinalError = state.errors?.valor_sinal?.[0];

  // Saldo que o cliente ainda paga na retirada.
  const saldo = Math.max(0, (combinadoCents ?? 0) - (sinalCents ?? 0));

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="watch_id" value={watchId} />

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      {clients.length === 0 ? (
        <Alert tone="info" title="Nenhum cliente cadastrado">
          Use o botao + ao lado do campo para cadastrar o cliente sem sair
          desta tela.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-5">
          <Field id="client_id" label="Cliente" error={clientError} required>
            <ClientSelect
              name="client_id"
              clients={clients}
              ariaProps={fieldAria("client_id", { error: clientError })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="valor_combinado"
              label="Valor combinado"
              error={combinadoError}
              required
            >
              <MoneyInput
                name="valor_combinado"
                defaultValueCents={valorAnunciadoCents}
                onValueChange={setCombinadoCents}
                {...fieldAria("valor_combinado", { error: combinadoError })}
              />
            </Field>

            <Field
              id="validade"
              label="Reserva vale ate"
              error={validadeError}
              required
            >
              <Input
                name="validade"
                type="date"
                min={hoje}
                defaultValue={validadePadrao}
                {...fieldAria("validade", { error: validadeError })}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="valor_sinal"
              label="Sinal recebido"
              error={sinalError}
              description={SINAL_DESCRICAO}
            >
              <MoneyInput
                name="valor_sinal"
                onValueChange={setSinalCents}
                {...fieldAria("valor_sinal", {
                  error: sinalError,
                  description: SINAL_DESCRICAO,
                })}
              />
            </Field>

            <Field id="forma_pagamento" label="Forma de pagamento do sinal">
              <Input
                name="forma_pagamento"
                placeholder="Ex.: PIX"
                maxLength={60}
                {...fieldAria("forma_pagamento", {})}
              />
            </Field>
          </div>

          {sinalCents ? (
            <>
              <input type="hidden" name="data_sinal" value={hoje} />

              {/* O saldo aparece antes de confirmar, nao so depois. */}
              <div className="flex justify-between rounded-md bg-surface px-3 py-2 text-sm">
                <span className="text-muted">Saldo restante na retirada</span>
                <span className="font-medium tabular-nums" data-money>
                  {formatBRL(saldo)}
                </span>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={`/estoque/${watchId}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Cancelar
        </Link>

        <Button
          type="submit"
          size="lg"
          disabled={pending}
        >
          {pending ? <Spinner label="Criando reserva" /> : null}
          {pending ? "Criando reserva..." : "Criar reserva"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted sm:text-right">
        {watchLabel} passa para reservado e sai da lista de disponiveis.
      </p>
    </form>
  );
}
