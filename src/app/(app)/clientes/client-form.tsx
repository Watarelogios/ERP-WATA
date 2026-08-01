"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { saveClientAction, type ClientFormState } from "@/lib/actions/contacts";
import type { ClientRow } from "@/lib/queries/contacts";

const INITIAL_STATE: ClientFormState = {};

const INTERESSES_DESCRIPTION =
  "Marcas, modelos ou estilos que o cliente procura. Aparece nas buscas de oportunidade.";

export function ClientForm({ client }: { client?: ClientRow }) {
  const [state, action, pending] = useActionState(
    saveClientAction,
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
      {client ? <input type="hidden" name="id" value={client.id} /> : null}

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field id="nome" label="Nome" error={nomeError} required>
        <Input
          ref={nomeRef}
          name="nome"
          defaultValue={client?.nome ?? ""}
          maxLength={120}
          autoComplete="name"
          autoFocus={!client}
          {...fieldAria("nome", { error: nomeError })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cidade" label="Cidade" error={state.errors?.cidade?.[0]}>
          <Input
            name="cidade"
            defaultValue={client?.cidade ?? ""}
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
            defaultValue={client?.telefone ?? ""}
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
          defaultValue={client?.instagram ? `@${client.instagram}` : ""}
          maxLength={60}
          placeholder="@usuario"
          {...fieldAria("instagram", { error: state.errors?.instagram?.[0] })}
        />
      </Field>

      <Field
        id="interesses"
        label="Interesses"
        description={INTERESSES_DESCRIPTION}
        error={state.errors?.interesses?.[0]}
      >
        <Textarea
          name="interesses"
          defaultValue={client?.interesses ?? ""}
          maxLength={500}
          placeholder="Ex.: Seiko de mergulho, cronografos ate R$ 5.000"
          {...fieldAria("interesses", {
            error: state.errors?.interesses?.[0],
            description: INTERESSES_DESCRIPTION,
          })}
        />
      </Field>

      <Field
        id="observacoes"
        label="Observacoes"
        error={state.errors?.observacoes?.[0]}
      >
        <Textarea
          name="observacoes"
          defaultValue={client?.observacoes ?? ""}
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
            : client
              ? "Salvar alteracoes"
              : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
