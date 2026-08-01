"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createOpportunityAction,
  updateOpportunityAction,
  type OpportunityFormState,
} from "@/lib/actions/purchases";
import type { OpportunityRow } from "@/lib/queries/purchases";

const INITIAL_STATE: OpportunityFormState = {};

const OFERTA_DESCRICAO =
  "Quanto a WATA pretende pagar. Serve de referencia na negociacao; o valor final e confirmado na compra.";

export type OpportunityFormProps = {
  suppliers: Array<{ id: string; nome: string }>;
  opportunity?: OpportunityRow;
};

export function OpportunityForm({
  suppliers,
  opportunity,
}: OpportunityFormProps) {
  const action = opportunity
    ? updateOpportunityAction.bind(null, opportunity.id)
    : createOpportunityAction;

  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const modeloRef = useRef<HTMLInputElement>(null);
  const modeloError = state.errors?.modelo?.[0];

  useEffect(() => {
    if (modeloError) {
      modeloRef.current?.focus();
    }
  }, [modeloError]);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Card>
        <CardContent className="space-y-5">
          <Field id="modelo" label="Modelo" error={modeloError} required>
            <Input
              ref={modeloRef}
              name="modelo"
              defaultValue={opportunity?.modelo ?? ""}
              placeholder="Ex.: Seiko Alpinist SPB121"
              maxLength={120}
              autoFocus={!opportunity}
              {...fieldAria("modelo", { error: modeloError })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="referencia" label="Referencia">
              <Input
                name="referencia"
                defaultValue={opportunity?.referencia ?? ""}
                placeholder="Ex.: SPB121J1"
                maxLength={80}
                {...fieldAria("referencia", {})}
              />
            </Field>

            <Field id="cidade" label="Cidade">
              <Input
                name="cidade"
                defaultValue={opportunity?.cidade ?? ""}
                maxLength={80}
                {...fieldAria("cidade", {})}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="valor_pedido" label="Valor pedido">
              <MoneyInput
                name="valor_pedido"
                defaultValueCents={
                  opportunity?.valor_pedido
                    ? Math.round(opportunity.valor_pedido * 100)
                    : null
                }
                {...fieldAria("valor_pedido", {})}
              />
            </Field>

            <Field
              id="minha_oferta"
              label="Minha oferta"
              description={OFERTA_DESCRICAO}
            >
              <MoneyInput
                name="minha_oferta"
                defaultValueCents={
                  opportunity?.minha_oferta
                    ? Math.round(opportunity.minha_oferta * 100)
                    : null
                }
                {...fieldAria("minha_oferta", {
                  description: OFERTA_DESCRICAO,
                })}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="supplier_id" label="Fornecedor">
              <Select
                name="supplier_id"
                defaultValue={opportunity?.supplier_id ?? ""}
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

            <Field id="data_contato" label="Data do contato">
              <Input
                name="data_contato"
                type="date"
                defaultValue={opportunity?.data_contato ?? hoje}
                {...fieldAria("data_contato", {})}
              />
            </Field>
          </div>

          <Field id="notas" label="Notas">
            <Textarea
              name="notas"
              defaultValue={opportunity?.notas ?? ""}
              maxLength={1000}
              placeholder="Estado da negociacao, combinados, pendencias..."
              {...fieldAria("notas", {})}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={opportunity ? `/compras/${opportunity.id}` : "/compras"}
          className={buttonVariants({ variant: "secondary" })}
        >
          Cancelar
        </Link>

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label="Salvando" /> : null}
          {pending
            ? "Salvando..."
            : opportunity
              ? "Salvar alteracoes"
              : "Cadastrar oportunidade"}
        </Button>
      </div>
    </form>
  );
}
