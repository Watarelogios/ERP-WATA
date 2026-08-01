"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListEditor } from "@/components/ui/list-editor";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  saveSettingsAction,
  type SettingsFormState,
} from "@/lib/actions/settings";
import type { Settings } from "@/lib/queries/settings";

const INITIAL_STATE: SettingsFormState = {};

const SALDO_DESCRIPTION =
  "Quanto a WATA tem em caixa hoje, antes de qualquer movimento registrado aqui.";
const DIAS_DESCRIPTION =
  "A partir de quantos dias um item em estoque passa a aparecer como parado.";

export type SettingsFormProps = {
  settings: Settings | null;
  /** No primeiro acesso o texto e o botao mudam de tom. */
  firstRun?: boolean;
};

export function SettingsForm({ settings, firstRun }: SettingsFormProps) {
  const [state, action, pending] = useActionState(
    saveSettingsAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  const nomeRef = useRef<HTMLInputElement>(null);
  const saldoRef = useRef<HTMLInputElement>(null);

  const nomeError = state.errors?.nome_loja?.[0];
  const saldoError = state.errors?.saldo_inicial?.[0];
  const diasError = state.errors?.dias_estoque_parado?.[0];

  useEffect(() => {
    if (nomeError) {
      nomeRef.current?.focus();
    } else if (saldoError) {
      saldoRef.current?.focus();
    }
  }, [nomeError, saldoError]);

  // O aviso de sucesso vem por toast; o de erro fica fixo junto do formulario.
  const successMessage = state.success ? state.message : undefined;
  useEffect(() => {
    if (successMessage) {
      showToast("success", successMessage);
    }
  }, [successMessage, showToast]);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && !state.success ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados da loja</CardTitle>
          <CardDescription>
            Aparecem nas telas internas e nos documentos gerados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field id="nome_loja" label="Nome da loja" error={nomeError} required>
            <Input
              ref={nomeRef}
              name="nome_loja"
              defaultValue={settings?.nomeLoja ?? "WATA"}
              maxLength={80}
              autoComplete="organization"
              {...fieldAria("nome_loja", { error: nomeError })}
            />
          </Field>

          <Field
            id="logo_url"
            label="URL do logo"
            description="Opcional. Deixe em branco para usar a marca tipografica."
          >
            <Input
              name="logo_url"
              type="url"
              defaultValue={settings?.logoUrl ?? ""}
              placeholder="https://..."
              {...fieldAria("logo_url", {
                description: "Opcional.",
              })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Caixa</CardTitle>
          <CardDescription>
            O saldo inicial e o ponto de partida: caixa = saldo inicial +
            entradas confirmadas − saidas confirmadas.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field
            id="saldo_inicial"
            label="Saldo inicial"
            error={saldoError}
            description={SALDO_DESCRIPTION}
            required
          >
            <MoneyInput
              ref={saldoRef}
              name="saldo_inicial"
              defaultValueCents={settings?.saldoInicialCents ?? 0}
              {...fieldAria("saldo_inicial", {
                error: saldoError,
                description: SALDO_DESCRIPTION,
              })}
            />
          </Field>

          <Field
            id="dias_estoque_parado"
            label="Dias para considerar o estoque parado"
            error={diasError}
            description={DIAS_DESCRIPTION}
          >
            <Input
              name="dias_estoque_parado"
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              defaultValue={settings?.diasEstoqueParado ?? 90}
              className="max-w-32"
              {...fieldAria("dias_estoque_parado", {
                error: diasError,
                description: DIAS_DESCRIPTION,
              })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listas</CardTitle>
          <CardDescription>
            Canais alimentam a origem da venda; categorias organizam o estoque.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-graphite-dark">
              Canais de venda
            </p>
            <ListEditor
              name="canais_venda"
              label="Canais de venda"
              defaultItems={
                settings?.canaisVenda ?? [
                  "Instagram",
                  "WhatsApp",
                  "OLX",
                  "Indicacao",
                  "Outros",
                ]
              }
              placeholder="Ex.: Instagram"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-graphite-dark">Categorias</p>
            <ListEditor
              name="categorias"
              label="Categorias"
              defaultItems={settings?.categorias ?? []}
              placeholder="Ex.: Mergulho"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner label="Salvando" /> : null}
          {pending
            ? "Salvando..."
            : firstRun
              ? "Concluir configuracao"
              : "Salvar configuracoes"}
        </Button>
      </div>
    </form>
  );
}
