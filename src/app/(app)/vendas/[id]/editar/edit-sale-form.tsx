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
  updateSaleAction,
  type UpdateSaleFormState,
} from "@/lib/actions/sales";
import { formatBRL, parseBRL } from "@/lib/money";

const INITIAL_STATE: UpdateSaleFormState = {};

export type EditSaleFormProps = {
  saleId: string;
  watchLabel: string;
  valorAtualCents: number;
  /** Custo do proprio, para prever o novo lucro. */
  valorCompraCents: number | null;
  /** Sinal ja recebido: nao volta a entrar no caixa. */
  sinalCents: number;
  origem: string | null;
  formaPagamento: string | null;
  dataVenda: string;
  clientId: string;
  clients: Array<{ id: string; nome: string }>;
  canais: string[];
  /** Venda vinda de reserva mantem o cliente da reserva. */
  clienteTravado: boolean;
  /** Consignado por percentual com repasse ja pago: valor nao pode mudar. */
  valorTravado: boolean;
  percentualWata: number | null;
};

export function EditSaleForm({
  saleId,
  watchLabel,
  valorAtualCents,
  valorCompraCents,
  sinalCents,
  origem,
  formaPagamento,
  dataVenda,
  clientId,
  clients,
  canais,
  clienteTravado,
  valorTravado,
  percentualWata,
}: EditSaleFormProps) {
  const [state, action, pending] = useActionState(
    updateSaleAction,
    INITIAL_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const confirmado = useRef(false);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [valorCents, setValorCents] = useState<number>(valorAtualCents);

  const valorError = state.errors?.valor_venda?.[0];

  useEffect(() => {
    if (valorError) {
      valorRef.current?.focus();
    }
  }, [valorError]);

  const mudou = valorCents !== valorAtualCents;
  const diferenca = valorCents - valorAtualCents;
  const entradaNova = Math.max(0, valorCents - sinalCents);

  const lucroNovo =
    percentualWata !== null
      ? Math.round((valorCents * percentualWata) / 100)
      : valorCompraCents !== null
        ? valorCents - valorCompraCents
        : null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmado.current || !mudou) {
      // Sem mudanca de valor nao ha efeito financeiro a confirmar.
      return;
    }

    event.preventDefault();

    const data = new FormData(event.currentTarget);
    setValorCents(parseBRL(String(data.get("valor_venda") ?? "")) ?? 0);
    setDialogAberto(true);
  }

  const detalhes = [
    { label: "Valor atual", value: formatBRL(valorAtualCents) },
    { label: "Novo valor", value: formatBRL(valorCents) },
    {
      label: diferenca >= 0 ? "Entra no caixa" : "Sai do caixa",
      value: formatBRL(Math.abs(diferenca)),
    },
  ];

  if (lucroNovo !== null) {
    detalhes.push({
      label: percentualWata !== null ? "Nova comissao" : "Novo lucro bruto",
      value: formatBRL(lucroNovo),
    });
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate>
        <input type="hidden" name="sale_id" value={saleId} />

        {state.message ? (
          <Alert tone="danger" className="mb-4">
            {state.message}
          </Alert>
        ) : null}

        {valorTravado ? (
          <Alert tone="warning" title="Valor bloqueado" className="mb-4">
            O repasse ao consignante ja foi pago e e calculado sobre o valor
            desta venda. Alterar o valor faria o caixa contar uma saida que nao
            aconteceu. Estorne o repasse antes, se precisar corrigir.
          </Alert>
        ) : null}

        {sinalCents > 0 ? (
          <Alert tone="info" className="mb-4">
            Esta venda teve {formatBRL(sinalCents)} de sinal recebido na reserva.
            Ao mudar o valor, apenas a diferenca do restante mexe no caixa — o
            sinal nao e cobrado de novo.
          </Alert>
        ) : null}

        <Card className="mb-4">
          <CardContent className="space-y-5">
            <Field
              id="valor_venda"
              label="Valor da venda"
              error={valorError}
              required
            >
              <MoneyInput
                ref={valorRef}
                name="valor_venda"
                defaultValueCents={valorAtualCents}
                onValueChange={(cents) => setValorCents(cents ?? 0)}
                disabled={valorTravado}
                {...fieldAria("valor_venda", { error: valorError })}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="data_venda" label="Data da venda">
                <Input
                  name="data_venda"
                  type="date"
                  defaultValue={dataVenda}
                  {...fieldAria("data_venda", {})}
                />
              </Field>

              <Field id="origem" label="Origem da venda">
                <Select
                  name="origem"
                  defaultValue={origem ?? ""}
                  {...fieldAria("origem", {})}
                >
                  <option value="">Nao informado</option>
                  {canais.map((canal) => (
                    <option key={canal} value={canal}>
                      {canal}
                    </option>
                  ))}
                  {/* Canal antigo, removido das configuracoes, nao some da venda. */}
                  {origem && !canais.includes(origem) ? (
                    <option value={origem}>{origem}</option>
                  ) : null}
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="forma_pagamento" label="Forma de pagamento">
                <Input
                  name="forma_pagamento"
                  defaultValue={formaPagamento ?? ""}
                  maxLength={60}
                  {...fieldAria("forma_pagamento", {})}
                />
              </Field>

              <Field
                id="client_id"
                label="Cliente"
                description={
                  clienteTravado
                    ? "Venda originada de reserva: o cliente vem da reserva."
                    : undefined
                }
              >
                <Select
                  name="client_id"
                  defaultValue={clientId}
                  disabled={clienteTravado}
                  {...fieldAria("client_id", {
                    description: clienteTravado ? "Vem da reserva." : undefined,
                  })}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Efeito visivel antes de confirmar, nao depois. */}
            {mudou ? (
              <dl className="space-y-1.5 rounded-md bg-surface p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">
                    {diferenca >= 0 ? "Entra no caixa" : "Sai do caixa"}
                  </dt>
                  <dd className="font-medium tabular-nums" data-money>
                    {formatBRL(Math.abs(diferenca))}
                  </dd>
                </div>

                {sinalCents > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Entrada da venda passa a ser</dt>
                    <dd className="tabular-nums" data-money>
                      {formatBRL(entradaNova)}
                    </dd>
                  </div>
                ) : null}

                {lucroNovo !== null ? (
                  <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                    <dt className="text-muted">
                      {percentualWata !== null
                        ? "Nova comissao da WATA"
                        : "Novo lucro bruto"}
                    </dt>
                    <dd className="font-medium tabular-nums" data-money>
                      {formatBRL(lucroNovo)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/vendas"
            className={buttonVariants({ variant: "secondary" })}
          >
            Cancelar
          </Link>

          <Button type="submit" disabled={pending}>
            {pending ? <Spinner label="Salvando" /> : null}
            {pending ? "Salvando..." : "Salvar alteracoes"}
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
        title="Confirmar alteracao de valor"
        description={
          <>
            O lucro, o valor vendido do relogio e o caixa serao recalculados.
            {percentualWata !== null
              ? " O repasse pendente ao consignante tambem e ajustado."
              : ""}{" "}
            A alteracao fica registrada no historico do relogio.
          </>
        }
        details={detalhes}
        confirmLabel="Salvar alteracoes"
      />
    </>
  );
}
