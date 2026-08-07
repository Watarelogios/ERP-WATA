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
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, Textarea } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createWatchAction,
  type WatchFormState,
} from "@/lib/actions/watches";
import {
  CONSIGNMENT_MODE,
  MOVEMENT_TYPE,
  WATCH_TYPE,
  toOptions,
} from "@/lib/labels";

const INITIAL_STATE: WatchFormState = {};

export type SupplierOption = {
  id: string;
  nome: string;
  tipo_relacao: "SELLER" | "CONSIGNOR" | "BOTH";
};

/** Valores atuais ao editar; ausente no cadastro. */
export type WatchDefaults = {
  tipo: "OWNED" | "CONSIGNED";
  marca: string;
  modelo: string;
  referencia: string | null;
  ano: number | null;
  movimento: string | null;
  diametro_mm: number | null;
  mostrador: string | null;
  condicao: string | null;
  valorCompraCents: number | null;
  valorMinimoCents: number | null;
  valorAnunciadoCents: number | null;
  supplierId: string | null;
  dataEntrada: string;
  observacoes: string | null;
  consignacao: {
    supplierId: string;
    modalidade: "FIXED_PAYOUT" | "WATA_PERCENTAGE";
    valorFixoCents: number | null;
    percentual: number | null;
    prazo: string | null;
  } | null;
};

export type WatchFormProps = {
  suppliers: SupplierOption[];
  defaults?: WatchDefaults;
  /** Compra ja lancada no caixa; so faz sentido na edicao. */
  compraJaLancada?: boolean;
  /** Server Action de edicao ja ligada ao id; ausente no cadastro. */
  editAction?: (
    state: WatchFormState,
    formData: FormData,
  ) => Promise<WatchFormState>;
};

export function WatchForm({
  suppliers,
  defaults,
  compraJaLancada,
  editAction,
}: WatchFormProps) {
  const [state, action, pending] = useActionState(
    editAction ?? createWatchAction,
    INITIAL_STATE,
  );

  const isEdit = Boolean(defaults);

  /*
   * Campos de consignacao aparecem apenas quando tipo = CONSIGNED (Secao 15.2).
   * O tipo nao e editavel depois: proprio tem custo, consignado tem repasse.
   */
  const [tipo, setTipo] = useState<"OWNED" | "CONSIGNED">(
    defaults?.tipo ?? "OWNED",
  );

  /*
   * Desmarcado por padrao: o primeiro uso do sistema costuma ser cadastrar o
   * estoque que ja existe, cujo dinheiro saiu antes. Marcar por engano
   * derrubaria o caixa sem motivo.
   */
  const [lancarNoCaixa, setLancarNoCaixa] = useState(false);
  const [modalidade, setModalidade] = useState<
    "FIXED_PAYOUT" | "WATA_PERCENTAGE"
  >(defaults?.consignacao?.modalidade ?? "FIXED_PAYOUT");

  const consignantes = suppliers.filter(
    (supplier) => supplier.tipo_relacao !== "SELLER",
  );

  const marcaRef = useRef<HTMLInputElement>(null);
  const marcaError = state.errors?.marca?.[0];

  useEffect(() => {
    if (marcaError) {
      marcaRef.current?.focus();
    }
  }, [marcaError]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="tipo" value={tipo} />

      {state.message && !state.success ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {state.success && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      {/*
       * Minimo acima do anunciado nao bloqueia: exige confirmacao explicita
       * (Secao 10.3). O reenvio com o campo oculto marcado confirma.
       */}
      {state.needsConfirmation ? (
        <Alert tone="warning" title="Valor minimo acima do anunciado">
          <p>
            Normalmente o minimo fica abaixo do valor anunciado. Se for
            intencional, confirme para salvar assim mesmo.
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm font-medium text-graphite-dark">
            <input
              type="checkbox"
              name="confirmar_minimo_acima"
              value="true"
              className="size-4 accent-graphite"
            />
            Confirmo que o minimo fica acima do anunciado
          </label>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Identificacao</CardTitle>
          <CardDescription>
            O codigo WATA e gerado automaticamente ao salvar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {isEdit ? (
            // O tipo nao muda apos o cadastro: proprio tem custo de compra,
            // consignado tem regra de repasse — converter um no outro
            // corromperia o financeiro.
            <p className="text-sm text-muted">
              Tipo:{" "}
              <span className="font-medium text-graphite-dark">
                {WATCH_TYPE[tipo].label}
              </span>{" "}
              (nao pode ser alterado apos o cadastro)
            </p>
          ) : (
            <Field id="tipo-select" label="Tipo" required>
              <Select
                id="tipo-select"
                value={tipo}
                onChange={(event) =>
                  setTipo(event.target.value as "OWNED" | "CONSIGNED")
                }
              >
                {toOptions(WATCH_TYPE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.hint ? ` — ${option.hint}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="marca" label="Marca" error={marcaError} required>
              <Input
                ref={marcaRef}
                name="marca"
                defaultValue={defaults?.marca ?? ""}
                maxLength={80}
                autoFocus={!isEdit}
                placeholder="Ex.: Seiko"
                {...fieldAria("marca", { error: marcaError })}
              />
            </Field>

            <Field
              id="modelo"
              label="Modelo"
              error={state.errors?.modelo?.[0]}
              required
            >
              <Input
                name="modelo"
                defaultValue={defaults?.modelo ?? ""}
                maxLength={120}
                placeholder="Ex.: SKX007"
                {...fieldAria("modelo", { error: state.errors?.modelo?.[0] })}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="referencia"
              label="Referencia"
              error={state.errors?.referencia?.[0]}
            >
              <Input
                name="referencia"
                defaultValue={defaults?.referencia ?? ""}
                maxLength={80}
                placeholder="Ex.: SKX007J1"
                {...fieldAria("referencia", {
                  error: state.errors?.referencia?.[0],
                })}
              />
            </Field>

            <Field id="ano" label="Ano" error={state.errors?.ano?.[0]}>
              <Input
                name="ano"
                defaultValue={defaults?.ano ?? ""}
                type="number"
                inputMode="numeric"
                min={1800}
                max={2200}
                {...fieldAria("ano", { error: state.errors?.ano?.[0] })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Especificacoes</CardTitle>
          <CardDescription>Todos os campos sao opcionais.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field
            id="movimento"
            label="Movimento"
            error={state.errors?.movimento?.[0]}
          >
            <Select name="movimento" defaultValue={defaults?.movimento ?? ""}>
              <option value="">Nao informado</option>
              {toOptions(MOVEMENT_TYPE).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="diametro_mm"
            label="Diametro (mm)"
            error={state.errors?.diametro_mm?.[0]}
          >
            <Input
              name="diametro_mm"
              defaultValue={defaults?.diametro_mm ?? ""}
              inputMode="decimal"
              placeholder="Ex.: 40,5"
              {...fieldAria("diametro_mm", {
                error: state.errors?.diametro_mm?.[0],
              })}
            />
          </Field>

          <Field
            id="mostrador"
            label="Mostrador"
            error={state.errors?.mostrador?.[0]}
          >
            <Input name="mostrador" defaultValue={defaults?.mostrador ?? ""} maxLength={80} placeholder="Ex.: Preto" />
          </Field>

          <Field
            id="condicao"
            label="Condicao"
            error={state.errors?.condicao?.[0]}
          >
            <Input
              name="condicao"
              defaultValue={defaults?.condicao ?? ""}
              maxLength={80}
              placeholder="Ex.: Muito bom"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores</CardTitle>
          <CardDescription>
            {tipo === "OWNED"
              ? "O valor de compra e obrigatorio para itens proprios."
              : "Item consignado nao tem valor de compra; o repasse e definido abaixo."}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 sm:grid-cols-3">
          {tipo === "OWNED" ? (
            <Field
              id="valor_compra"
              label="Valor de compra"
              error={state.errors?.valor_compra?.[0]}
              required
            >
              <MoneyInput
                name="valor_compra"
                defaultValueCents={defaults?.valorCompraCents ?? null}
                {...fieldAria("valor_compra", {
                  error: state.errors?.valor_compra?.[0],
                })}
              />
            </Field>
          ) : null}

          <Field
            id="valor_anunciado"
            label="Valor anunciado"
            error={state.errors?.valor_anunciado?.[0]}
          >
            <MoneyInput
              name="valor_anunciado"
              defaultValueCents={defaults?.valorAnunciadoCents ?? null}
              {...fieldAria("valor_anunciado", {
                error: state.errors?.valor_anunciado?.[0],
              })}
            />
          </Field>

          <Field
            id="valor_minimo"
            label="Valor minimo"
            error={state.errors?.valor_minimo?.[0]}
          >
            <MoneyInput
              name="valor_minimo"
              defaultValueCents={defaults?.valorMinimoCents ?? null}
              {...fieldAria("valor_minimo", {
                error: state.errors?.valor_minimo?.[0],
              })}
            />
          </Field>
        </CardContent>

        {tipo === "OWNED" && compraJaLancada ? (
          <CardContent className="border-t border-border pt-4">
            {/* Ja lancado: informar em vez de oferecer uma acao sem efeito. */}
            <p className="text-sm text-muted">
              A compra deste relogio ja foi lancada no caixa. Para corrigir o
              valor, estorne o lancamento em Financeiro.
            </p>
          </CardContent>
        ) : null}

        {tipo === "OWNED" && !compraJaLancada ? (
          <CardContent className="border-t border-border pt-4">
            <label className="flex min-h-touch cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="lancar_no_caixa"
                checked={lancarNoCaixa}
                onChange={(event) => setLancarNoCaixa(event.target.checked)}
                className="mt-0.5 size-5 shrink-0 rounded border-border accent-graphite"
              />
              <span className="text-sm">
                <span className="font-medium text-graphite-dark">
                  Lancar a compra no caixa agora
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {editAction
                    ? "Marque para registrar agora a saida no caixa referente a compra deste relogio. Use quando o item foi cadastrado antes sem o lancamento."
                    : "Marque se voce pagou por este relogio agora. Uma saida confirmada no valor de compra e lancada junto com o cadastro. Deixe desmarcado para estoque que voce ja tinha antes do sistema — esse dinheiro saiu antes."}
                </span>
              </span>
            </label>
          </CardContent>
        ) : null}
      </Card>

      {tipo === "CONSIGNED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Consignacao</CardTitle>
            <CardDescription>
              Define quem e o consignante e como o repasse sera calculado na
              venda.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {consignantes.length === 0 ? (
              <Alert tone="warning" title="Nenhum consignante cadastrado">
                Cadastre um fornecedor do tipo consignante antes de registrar um
                item consignado.
              </Alert>
            ) : null}

            <Field
              id="consignacao_supplier_id"
              label="Consignante"
              error={state.errors?.consignacao_supplier_id?.[0]}
              required
            >
              <Select
                name="consignacao_supplier_id"
                defaultValue={defaults?.consignacao?.supplierId ?? ""}
                {...fieldAria("consignacao_supplier_id", {
                  error: state.errors?.consignacao_supplier_id?.[0],
                })}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {consignantes.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.nome}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="consignacao_modalidade" label="Modalidade" required>
              <Select
                id="consignacao_modalidade"
                name="consignacao_modalidade"
                value={modalidade}
                onChange={(event) =>
                  setModalidade(
                    event.target.value as "FIXED_PAYOUT" | "WATA_PERCENTAGE",
                  )
                }
              >
                {toOptions(CONSIGNMENT_MODE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.hint ? ` — ${option.hint}` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              {modalidade === "FIXED_PAYOUT" ? (
                <Field
                  id="consignacao_valor_fixo"
                  label="Valor do repasse"
                  error={state.errors?.consignacao_valor_fixo?.[0]}
                  required
                >
                  <MoneyInput
                    name="consignacao_valor_fixo"
                    defaultValueCents={defaults?.consignacao?.valorFixoCents ?? null}
                    {...fieldAria("consignacao_valor_fixo", {
                      error: state.errors?.consignacao_valor_fixo?.[0],
                    })}
                  />
                </Field>
              ) : (
                <Field
                  id="consignacao_percentual"
                  label="Percentual da WATA (%)"
                  error={state.errors?.consignacao_percentual?.[0]}
                  required
                >
                  <Input
                    name="consignacao_percentual"
                    defaultValue={defaults?.consignacao?.percentual ?? ""}
                    inputMode="decimal"
                    placeholder="Ex.: 12"
                    {...fieldAria("consignacao_percentual", {
                      error: state.errors?.consignacao_percentual?.[0],
                    })}
                  />
                </Field>
              )}

              <Field
                id="consignacao_prazo"
                label="Prazo da consignacao"
                error={state.errors?.consignacao_prazo?.[0]}
              >
                <Input
                  name="consignacao_prazo"
                  defaultValue={defaults?.consignacao?.prazo ?? ""}
                  type="date"
                  {...fieldAria("consignacao_prazo", {
                    error: state.errors?.consignacao_prazo?.[0],
                  })}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Origem e observacoes</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {tipo === "OWNED" ? (
            <Field
              id="supplier_id"
              label="Fornecedor"
              error={state.errors?.supplier_id?.[0]}
            >
              <Select name="supplier_id" defaultValue={defaults?.supplierId ?? ""}>
                <option value="">Nao informado</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.nome}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field
            id="data_entrada"
            label="Data de entrada"
            error={state.errors?.data_entrada?.[0]}
            description="Em branco usa a data de hoje."
          >
            <Input
              name="data_entrada"
              defaultValue={defaults?.dataEntrada ?? ""}
              type="date"
              className="max-w-48"
              {...fieldAria("data_entrada", {
                error: state.errors?.data_entrada?.[0],
                description: "Em branco usa a data de hoje.",
              })}
            />
          </Field>

          <Field
            id="observacoes"
            label="Observacoes"
            error={state.errors?.observacoes?.[0]}
          >
            <Textarea name="observacoes" defaultValue={defaults?.observacoes ?? ""} maxLength={1000} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isEdit
            ? "As fotos sao gerenciadas na tela do relogio."
            : "As fotos sao adicionadas na proxima etapa, apos salvar."}
        </p>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner label="Salvando" /> : null}
          {pending
            ? "Salvando..."
            : isEdit
              ? "Salvar alteracoes"
              : "Cadastrar relogio"}
        </Button>
      </div>
    </form>
  );
}
