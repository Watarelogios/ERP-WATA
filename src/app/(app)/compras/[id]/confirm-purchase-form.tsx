"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  confirmPurchaseAction,
  type ConfirmPurchaseFormState,
} from "@/lib/actions/purchases";
import { MOVEMENT_TYPE, toOptions } from "@/lib/labels";
import { formatBRL, parseBRL } from "@/lib/money";
import type { OpportunityRow } from "@/lib/queries/purchases";

const INITIAL_STATE: ConfirmPurchaseFormState = {};

const VALOR_DESCRICAO =
  "Valor efetivamente pago. Vira o custo do relogio e a saida no caixa.";

export type ConfirmPurchaseFormProps = {
  opportunity: OpportunityRow;
  suppliers: Array<{ id: string; nome: string }>;
  caixaAtualCents: number;
};

export function ConfirmPurchaseForm({
  opportunity,
  suppliers,
  caixaAtualCents,
}: ConfirmPurchaseFormProps) {
  const [state, action, pending] = useActionState(
    confirmPurchaseAction,
    INITIAL_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const marcaRef = useRef<HTMLInputElement>(null);
  /*
   * Marca que a confirmacao ja foi dada, para o submit seguinte passar direto.
   * Um ref (e nao estado) evita depender do re-render entre confirmar e enviar.
   */
  const confirmado = useRef(false);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [valorCents, setValorCents] = useState<number | null>(
    opportunity.minha_oferta
      ? Math.round(opportunity.minha_oferta * 100)
      : null,
  );

  const marcaError = state.errors?.marca?.[0];
  const valorError = state.errors?.valor_fechado?.[0];

  useEffect(() => {
    if (marcaError) {
      marcaRef.current?.focus();
    }
  }, [marcaError]);

  const hoje = new Date().toISOString().slice(0, 10);
  const movimentos = toOptions(MOVEMENT_TYPE);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmado.current) {
      return;
    }

    // Operacao financeira exige confirmacao explicita (Secao 15.2).
    event.preventDefault();

    // Le o valor do campo oculto do MoneyInput na hora do envio.
    const data = new FormData(event.currentTarget);
    setValorCents(parseBRL(String(data.get("valor_fechado") ?? "")));
    setDialogAberto(true);
  }

  const caixaDepois = caixaAtualCents - (valorCents ?? 0);

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} noValidate>
        <input
          type="hidden"
          name="opportunity_id"
          value={opportunity.id}
        />

        {state.message ? (
          <Alert tone="danger" className="mb-4">
            {state.message}
          </Alert>
        ) : null}

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Dados da compra</CardTitle>
            <CardDescription>
              Estes valores geram a saida no caixa e o custo do relogio.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="valor_fechado"
                label="Valor fechado"
                error={valorError}
                description={VALOR_DESCRICAO}
                required
              >
                <MoneyInput
                  name="valor_fechado"
                  defaultValueCents={valorCents}
                  onValueChange={setValorCents}
                  {...fieldAria("valor_fechado", {
                    error: valorError,
                    description: VALOR_DESCRICAO,
                  })}
                />
              </Field>

              <Field id="data_compra" label="Data da compra">
                <Input
                  name="data_compra"
                  type="date"
                  defaultValue={hoje}
                  {...fieldAria("data_compra", {})}
                />
              </Field>
            </div>

            <Field id="supplier_id" label="Fornecedor">
              <Select
                name="supplier_id"
                defaultValue={opportunity.supplier_id ?? ""}
                {...fieldAria("supplier_id", {})}
              >
                <option value="">Nao informado</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Dados do relogio</CardTitle>
            <CardDescription>
              O item entra no estoque como proprio e recebe o WATA-ID
              automaticamente.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="marca" label="Marca" error={marcaError} required>
                <Input
                  ref={marcaRef}
                  name="marca"
                  maxLength={80}
                  autoFocus
                  {...fieldAria("marca", { error: marcaError })}
                />
              </Field>

              <Field id="modelo" label="Modelo" required>
                <Input
                  name="modelo"
                  defaultValue={opportunity.modelo}
                  maxLength={120}
                  {...fieldAria("modelo", {})}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="referencia" label="Referencia">
                <Input
                  name="referencia"
                  defaultValue={opportunity.referencia ?? ""}
                  maxLength={80}
                  {...fieldAria("referencia", {})}
                />
              </Field>

              <Field id="ano" label="Ano">
                <Input
                  name="ano"
                  type="number"
                  inputMode="numeric"
                  min={1800}
                  max={2200}
                  {...fieldAria("ano", {})}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="movimento" label="Movimento">
                <Select name="movimento" {...fieldAria("movimento", {})}>
                  <option value="">Nao informado</option>
                  {movimentos.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="diametro_mm" label="Diametro (mm)">
                <Input
                  name="diametro_mm"
                  inputMode="decimal"
                  placeholder="Ex.: 40"
                  {...fieldAria("diametro_mm", {})}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="mostrador" label="Mostrador">
                <Input
                  name="mostrador"
                  maxLength={80}
                  {...fieldAria("mostrador", {})}
                />
              </Field>

              <Field id="condicao" label="Condicao">
                <Input
                  name="condicao"
                  maxLength={80}
                  {...fieldAria("condicao", {})}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="valor_minimo" label="Valor minimo">
                <MoneyInput
                  name="valor_minimo"
                  {...fieldAria("valor_minimo", {})}
                />
              </Field>

              <Field id="valor_anunciado" label="Valor anunciado">
                <MoneyInput
                  name="valor_anunciado"
                  {...fieldAria("valor_anunciado", {})}
                />
              </Field>
            </div>

            <Field id="observacoes" label="Observacoes">
              <Textarea
                name="observacoes"
                maxLength={1000}
                {...fieldAria("observacoes", {})}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Spinner label="Confirmando" /> : null}
            {pending ? "Confirmando..." : "Confirmar compra"}
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
        subject={opportunity.modelo}
        title="Confirmar compra"
        description={
          <>
            O relogio entra no estoque como disponivel e recebe o WATA-ID. Uma
            saida confirmada e lancada no caixa. A oportunidade e encerrada e
            nao podera mais ser editada.
          </>
        }
        details={[
          {
            label: "Valor da compra",
            value: valorCents === null ? "—" : formatBRL(valorCents),
          },
          { label: "Caixa atual", value: formatBRL(caixaAtualCents) },
          { label: "Caixa apos a compra", value: formatBRL(caixaDepois) },
        ]}
        confirmLabel="Confirmar compra"
      />
    </>
  );
}
