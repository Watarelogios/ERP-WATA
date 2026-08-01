"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  completeSaleAction,
  type CompleteSaleFormState,
} from "@/lib/actions/sales";
import { formatBRL, parseBRL } from "@/lib/money";

const INITIAL_STATE: CompleteSaleFormState = {};

export type SaleFormProps = {
  watchId: string;
  watchLabel: string;
  tipo: "OWNED" | "CONSIGNED";
  valorSugeridoCents: number | null;
  /** Custo do item proprio, para prever o lucro antes de confirmar. */
  valorCompraCents: number | null;
  /** Repasse devido ao consignante, quando o item e consignado. */
  repasseEstimadoCents: number | null;
  clients: Array<{ id: string; nome: string }>;
  canais: string[];
  hoje: string;
  /** Reserva ativa: o sinal ja entrou no caixa e nao e cobrado de novo. */
  reserva: {
    clientId: string;
    clientNome: string;
    sinalCents: number;
    combinadoCents: number;
  } | null;
};

export function SaleForm({
  watchId,
  watchLabel,
  tipo,
  valorSugeridoCents,
  valorCompraCents,
  repasseEstimadoCents,
  clients,
  canais,
  hoje,
  reserva,
}: SaleFormProps) {
  const [state, action, pending] = useActionState(
    completeSaleAction,
    INITIAL_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const confirmado = useRef(false);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [valorCents, setValorCents] = useState<number | null>(
    reserva?.combinadoCents ?? valorSugeridoCents,
  );

  const valorError = state.errors?.valor_venda?.[0];
  const clientError = state.errors?.client_id?.[0];

  useEffect(() => {
    if (valorError) {
      valorRef.current?.focus();
    }
  }, [valorError]);

  const sinal = reserva?.sinalCents ?? 0;
  const aReceber = Math.max(0, (valorCents ?? 0) - sinal);

  // Previsao do lucro; o valor definitivo e calculado pelo banco.
  const lucroPrevisto =
    tipo === "OWNED"
      ? (valorCents ?? 0) - (valorCompraCents ?? 0)
      : (valorCents ?? 0) - (repasseEstimadoCents ?? 0);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmado.current) {
      return;
    }

    // Operacao financeira exige confirmacao explicita (Secao 15.2).
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    setValorCents(parseBRL(String(data.get("valor_venda") ?? "")));
    setDialogAberto(true);
  }

  const detalhes = [
    { label: "Valor da venda", value: formatBRL(valorCents ?? 0) },
  ];

  if (sinal > 0) {
    detalhes.push(
      { label: "Sinal ja recebido", value: `− ${formatBRL(sinal)}` },
      { label: "Entra no caixa agora", value: formatBRL(aReceber) },
    );
  }

  if (tipo === "CONSIGNED" && repasseEstimadoCents !== null) {
    detalhes.push({
      label: "Repasse ao consignante",
      value: `${formatBRL(repasseEstimadoCents)} (pendente)`,
    });
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate>
        <input type="hidden" name="watch_id" value={watchId} />

        {state.message ? (
          <Alert tone="danger" className="mb-4">
            {state.message}
          </Alert>
        ) : null}

        {reserva ? (
          <Alert tone="info" title="Item reservado" className="mb-4">
            Reservado para <strong>{reserva.clientNome}</strong>, com sinal de{" "}
            {formatBRL(reserva.sinalCents)} ja recebido. A venda so pode ser
            concluida para esse cliente, e o sinal nao sera cobrado de novo.
          </Alert>
        ) : null}

        <Card className="mb-4">
          <CardContent className="space-y-5">
            <Field id="client_id" label="Cliente" error={clientError} required>
              <Select
                name="client_id"
                defaultValue={reserva?.clientId ?? ""}
                // Item reservado ja tem cliente definido pela reserva.
                disabled={Boolean(reserva)}
                {...fieldAria("client_id", { error: clientError })}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nome}
                  </option>
                ))}
              </Select>
            </Field>

            {reserva ? (
              <input type="hidden" name="client_id" value={reserva.clientId} />
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="valor_venda"
                label="Valor da venda"
                error={valorError}
                required
              >
                <MoneyInput
                  ref={valorRef}
                  name="valor_venda"
                  defaultValueCents={valorCents}
                  onValueChange={setValorCents}
                  {...fieldAria("valor_venda", { error: valorError })}
                />
              </Field>

              <Field id="data_venda" label="Data da venda">
                <Input
                  name="data_venda"
                  type="date"
                  defaultValue={hoje}
                  {...fieldAria("data_venda", {})}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="origem" label="Origem da venda">
                <Select name="origem" defaultValue="" {...fieldAria("origem", {})}>
                  <option value="">Nao informado</option>
                  {canais.map((canal) => (
                    <option key={canal} value={canal}>
                      {canal}
                    </option>
                  ))}
                </Select>
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

            {/* Resumo financeiro visivel antes de confirmar. */}
            <dl className="space-y-1.5 rounded-md bg-surface p-3 text-sm">
              {sinal > 0 ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Sinal ja recebido</dt>
                    <dd className="tabular-nums" data-money>
                      {formatBRL(sinal)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">A receber agora</dt>
                    <dd className="font-medium tabular-nums" data-money>
                      {formatBRL(aReceber)}
                    </dd>
                  </div>
                </>
              ) : null}

              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt className="text-muted">
                  {tipo === "OWNED" ? "Lucro bruto previsto" : "Comissao da WATA"}
                </dt>
                <dd className="font-medium tabular-nums" data-money>
                  {formatBRL(lucroPrevisto)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href={`/estoque/${watchId}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Cancelar
          </Link>

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner label="Confirmando" /> : null}
            {pending ? "Confirmando..." : "Confirmar venda e pagamento"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        onConfirm={() => {
          confirmado.current = true;
          setDialogAberto(false);
          formRef.current?.requestSubmit();
        }}
        subject={watchLabel}
        title="Confirmar venda e pagamento"
        description={
          <>
            O relogio sai do estoque ativo como vendido e o historico e
            preservado.
            {tipo === "CONSIGNED"
              ? " O repasse ao consignante fica pendente e nao reduz o caixa agora."
              : ""}
          </>
        }
        details={detalhes}
        confirmLabel="Confirmar venda"
      />
    </>
  );
}
