"use client";

import { CalendarClock } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  createInstallmentPurchaseAction,
  type InstallmentFormState,
} from "@/lib/actions/financial";
import { formatBRL } from "@/lib/money";

const INITIAL_STATE: InstallmentFormState = {};

const CATEGORIAS = [
  { value: "PURCHASE", label: "Compra de relogio" },
  { value: "SERVICE", label: "Servico" },
  { value: "STRAP", label: "Pulseira" },
  { value: "PACKAGING", label: "Embalagem" },
  { value: "SHIPPING", label: "Envio" },
  { value: "META_ADS", label: "Meta Ads" },
  { value: "OTHER_EXPENSE", label: "Outras saidas" },
];

/**
 * Previa das parcelas.
 *
 * Reproduz a divisao em centavos que o banco faz: o resto vai na ultima
 * parcela. Mostrar antes evita a surpresa de ver 333,34 na quinta linha.
 *
 * Em parcela unica nao ha o que dividir, e repetir "1x de X / Total X" so
 * ocuparia espaco.
 */
function preverParcelas(totalCents: number, parcelas: number) {
  if (totalCents <= 0 || parcelas < 2) {
    return null;
  }

  const base = Math.floor(totalCents / parcelas);
  const resto = totalCents - base * parcelas;

  return { base, ultima: base + resto, temResto: resto > 0 };
}

export function InstallmentForm({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(
    createInstallmentPurchaseAction,
    INITIAL_STATE,
  );
  const { showToast } = useToast();

  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [parcelas, setParcelas] = useState(2);

  const concluido = Boolean(state.success);
  const visivel = aberto && !concluido;

  const mensagem = concluido ? state.message : undefined;
  useEffect(() => {
    if (mensagem) {
      showToast("success", mensagem);
    }
  }, [mensagem, showToast]);

  const previa = preverParcelas(totalCents ?? 0, parcelas);
  const parcelaUnica = parcelas === 1;

  const descricaoError = state.errors?.descricao?.[0];
  const valorError = state.errors?.valor_total?.[0];
  const parcelasError = state.errors?.parcelas?.[0];

  return (
    <>
      <Button variant="secondary" onClick={() => setAberto(true)}>
        <CalendarClock className="size-4" aria-hidden="true" />
        Compra a prazo
      </Button>

      {visivel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-graphite-dark/40"
            onClick={() => !pending && setAberto(false)}
            aria-label="Fechar"
            tabIndex={-1}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="parcelada-titulo"
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-card border border-border bg-white p-5"
          >
            <h2 id="parcelada-titulo" className="text-base font-semibold">
              Compra a prazo
            </h2>
            <p className="mt-1 text-sm text-muted">
              Parcelada ou para pagar de uma vez la na frente. Cada parcela
              entra como saida pendente, e o caixa so e debitado quando voce
              marca o pagamento.
            </p>

            <form action={action} className="mt-4 space-y-4">
              {state.message && !state.success ? (
                <Alert tone="danger">{state.message}</Alert>
              ) : null}

              <Field
                id="descricao"
                label="Descricao"
                error={descricaoError}
                description={
                  parcelaUnica
                    ? "Aparece assim no extrato."
                    : "Aparece em toda parcela, depois de 'Parcela 1/5 - '."
                }
                required
              >
                <Input
                  name="descricao"
                  maxLength={200}
                  placeholder="Ex.: Tag Heuer ref X"
                  autoFocus
                  {...fieldAria("descricao", {
                    error: descricaoError,
                    description: parcelaUnica
                      ? "Aparece assim no extrato."
                      : "Aparece em toda parcela.",
                  })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="valor_total"
                  label="Valor total"
                  error={valorError}
                  required
                >
                  <MoneyInput
                    name="valor_total"
                    onValueChange={setTotalCents}
                    {...fieldAria("valor_total", { error: valorError })}
                  />
                </Field>

                <Field
                  id="parcelas"
                  label="Parcelas"
                  error={parcelasError}
                  description="Use 1 para pagar tudo em uma data so."
                  required
                >
                  <Input
                    name="parcelas"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={parcelas}
                    onChange={(event) =>
                      setParcelas(Number(event.target.value) || 0)
                    }
                    {...fieldAria("parcelas", {
                      error: parcelasError,
                      description: "Use 1 para pagar tudo em uma data so.",
                    })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="primeiro_vencimento"
                  label={parcelaUnica ? "Vencimento" : "Primeiro vencimento"}
                  description={
                    parcelaUnica ? undefined : "As demais vencem de mes em mes."
                  }
                >
                  <Input
                    name="primeiro_vencimento"
                    type="date"
                    defaultValue={hoje}
                    {...fieldAria("primeiro_vencimento", {
                      description: parcelaUnica
                        ? undefined
                        : "As demais vencem mensalmente.",
                    })}
                  />
                </Field>

                <Field id="categoria" label="Categoria">
                  <Select name="categoria" defaultValue="PURCHASE">
                    {CATEGORIAS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Como fica dividido, antes de gravar. */}
              {previa ? (
                <dl className="space-y-1.5 rounded-md bg-surface p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">
                      {previa.temResto
                        ? `${parcelas - 1}x de`
                        : `${parcelas}x de`}
                    </dt>
                    <dd className="font-medium tabular-nums" data-money>
                      {formatBRL(previa.base)}
                    </dd>
                  </div>

                  {previa.temResto ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">
                        Ultima parcela (ajuste dos centavos)
                      </dt>
                      <dd className="font-medium tabular-nums" data-money>
                        {formatBRL(previa.ultima)}
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                    <dt className="text-muted">Total</dt>
                    <dd className="font-medium tabular-nums" data-money>
                      {formatBRL(totalCents ?? 0)}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <Alert tone="info">
                {parcelaUnica
                  ? "O caixa nao muda agora. A saida fica pendente ate voce marcar o pagamento."
                  : "O caixa nao muda agora. As parcelas aparecem como pendentes ate voce marcar cada pagamento."}
              </Alert>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setAberto(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>

                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner label="Registrando" /> : null}
                  {pending
                    ? "Registrando..."
                    : parcelaUnica
                      ? "Registrar compra"
                      : "Registrar parcelamento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
