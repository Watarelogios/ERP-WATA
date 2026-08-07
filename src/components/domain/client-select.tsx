"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createQuickClientAction,
  type QuickClientState,
} from "@/lib/actions/contacts";

const INITIAL_STATE: QuickClientState = {};

export type ClientOption = { id: string; nome: string };

export type ClientSelectProps = {
  name: string;
  clients: ClientOption[];
  defaultValue?: string;
  disabled?: boolean;
  ariaProps?: Record<string, unknown>;
};

/**
 * Selecao de cliente com cadastro rapido embutido.
 *
 * Sem isso, atender um cliente novo obriga a abandonar a reserva ou a venda
 * pela metade, cadastrar em outra tela e recomecar — perdendo o que ja estava
 * preenchido. O cliente criado aqui e selecionado automaticamente.
 */
export function ClientSelect({
  name,
  clients,
  defaultValue = "",
  disabled,
  ariaProps,
}: ClientSelectProps) {
  const [state, action, pending] = useActionState(
    createQuickClientAction,
    INITIAL_STATE,
  );

  const [cadastrando, setCadastrando] = useState(false);
  const [selecionado, setSelecionado] = useState(defaultValue);
  const [criados, setCriados] = useState<ClientOption[]>([]);
  const nomeRef = useRef<HTMLInputElement>(null);

  /*
   * O cliente recem-criado entra na lista e ja fica selecionado.
   *
   * Ajuste durante a renderizacao (padrao "adjusting state when a prop
   * changes"), e nao setState em efeito, que provoca renderizacao em cascata.
   */
  const [ultimoCriado, setUltimoCriado] = useState<string | null>(null);
  const novo = state.success ? state.client : undefined;

  if (novo && novo.id !== ultimoCriado) {
    setUltimoCriado(novo.id);
    setCriados((atuais) => [...atuais, novo]);
    setSelecionado(novo.id);
    setCadastrando(false);
  }

  useEffect(() => {
    if (cadastrando) {
      nomeRef.current?.focus();
    }
  }, [cadastrando]);

  const opcoes = [...clients, ...criados].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const nomeError = state.errors?.nome?.[0];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select
          name={name}
          value={selecionado}
          onChange={(event) => setSelecionado(event.target.value)}
          disabled={disabled}
          className="min-w-0 flex-1"
          {...ariaProps}
        >
          <option value="">Selecione o cliente</option>
          {opcoes.map((client) => (
            <option key={client.id} value={client.id}>
              {client.nome}
            </option>
          ))}
        </Select>

        {!disabled ? (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCadastrando((aberto) => !aberto)}
            aria-expanded={cadastrando}
            aria-label={
              cadastrando ? "Fechar cadastro rapido" : "Cadastrar novo cliente"
            }
            title="Cadastrar novo cliente"
          >
            {cadastrando ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>

      {cadastrando ? (
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="mb-2 text-xs text-muted">
            Cadastro rapido: so o nome. Os demais dados podem ser completados
            depois em Clientes.
          </p>

          {/*
            `div` e nao `form`: este bloco vive dentro do formulario da reserva
            ou da venda, e formulario aninhado nao e HTML valido. Os campos se
            ligam ao form escondido abaixo pelo atributo `form`.
          */}
          <div className="flex gap-2">
            <Input
              ref={nomeRef}
              form="quick-client-form"
              name="nome"
              placeholder="Nome do cliente"
              maxLength={200}
              aria-label="Nome do novo cliente"
              aria-invalid={nomeError ? true : undefined}
            />

            <Button
              type="submit"
              form="quick-client-form"
              disabled={pending}
              className="shrink-0"
            >
              {pending ? <Spinner label="Salvando" /> : null}
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          {nomeError ? (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {nomeError}
            </p>
          ) : null}

          {state.message ? (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
        O formulario fica fora da arvore do formulario principal, e os campos
        se ligam a ele por `form="quick-client-form"`. Assim o cadastro rapido
        nao dispara o envio da reserva ou da venda.
      */}
      <form id="quick-client-form" action={action} className="hidden" />
    </div>
  );
}
