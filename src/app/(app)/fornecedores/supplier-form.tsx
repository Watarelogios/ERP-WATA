"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  saveSupplierAction,
  type SupplierFormState,
} from "@/lib/actions/contacts";
import { SUPPLIER_RELATION, toOptions } from "@/lib/labels";
import type { SupplierRow } from "@/lib/queries/contacts";

const INITIAL_STATE: SupplierFormState = {};

const TIPO_DESCRIPTION =
  "Consignantes aparecem ao cadastrar um relogio consignado e recebem repasses.";

export function SupplierForm({ supplier }: { supplier?: SupplierRow }) {
  const [state, action, pending] = useActionState(
    saveSupplierAction,
    INITIAL_STATE,
  );

  const nomeRef = useRef<HTMLInputElement>(null);
  const nomeError = state.errors?.nome?.[0];

  useEffect(() => {
    if (nomeError) {
      nomeRef.current?.focus();
    }
  }, [nomeError]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field id="nome" label="Nome" error={nomeError} required>
        <Input
          ref={nomeRef}
          name="nome"
          defaultValue={supplier?.nome ?? ""}
          maxLength={120}
          autoComplete="name"
          autoFocus={!supplier}
          {...fieldAria("nome", { error: nomeError })}
        />
      </Field>

      <Field
        id="tipo_relacao"
        label="Tipo de relacao"
        description={TIPO_DESCRIPTION}
        error={state.errors?.tipo_relacao?.[0]}
        required
      >
        <Select
          name="tipo_relacao"
          defaultValue={supplier?.tipo_relacao ?? "SELLER"}
          {...fieldAria("tipo_relacao", {
            error: state.errors?.tipo_relacao?.[0],
            description: TIPO_DESCRIPTION,
          })}
        >
          {toOptions(SUPPLIER_RELATION).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cidade" label="Cidade" error={state.errors?.cidade?.[0]}>
          <Input
            name="cidade"
            defaultValue={supplier?.cidade ?? ""}
            maxLength={80}
            autoComplete="address-level2"
            {...fieldAria("cidade", { error: state.errors?.cidade?.[0] })}
          />
        </Field>

        <Field
          id="telefone"
          label="Telefone"
          error={state.errors?.telefone?.[0]}
        >
          <Input
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={supplier?.telefone ?? ""}
            maxLength={20}
            placeholder="(81) 99999-9999"
            autoComplete="tel"
            {...fieldAria("telefone", { error: state.errors?.telefone?.[0] })}
          />
        </Field>
      </div>

      <Field
        id="instagram"
        label="Instagram"
        error={state.errors?.instagram?.[0]}
      >
        <Input
          name="instagram"
          defaultValue={supplier?.instagram ? `@${supplier.instagram}` : ""}
          maxLength={60}
          placeholder="@usuario"
          {...fieldAria("instagram", { error: state.errors?.instagram?.[0] })}
        />
      </Field>

      <Field
        id="observacoes"
        label="Observacoes"
        error={state.errors?.observacoes?.[0]}
      >
        <Textarea
          name="observacoes"
          defaultValue={supplier?.observacoes ?? ""}
          maxLength={1000}
          {...fieldAria("observacoes", {
            error: state.errors?.observacoes?.[0],
          })}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner label="Salvando" /> : null}
          {pending
            ? "Salvando..."
            : supplier
              ? "Salvar alteracoes"
              : "Cadastrar fornecedor"}
        </Button>
      </div>
    </form>
  );
}
