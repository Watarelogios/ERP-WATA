"use client";

import { Check, Pencil, Undo2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { PayInstallmentButton } from "@/components/domain/pay-installment-button";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  renameInstallmentPlanAction,
  unpayInstallmentAction,
  updateInstallmentAction,
} from "@/lib/actions/financial";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils/cn";

/*
 * As datas chegam ja formatadas do servidor. Formatar aqui usaria o fuso do
 * navegador, e APP_TIMEZONE nao existe no bundle do cliente.
 */
export type ParcelaItem = {
  id: string;
  numero: number;
  valorCents: number;
  vencimento: string;
  vencimentoLabel: string;
  paga: boolean;
  pagamentoLabel: string | null;
};

export type InstallmentPlanCardProps = {
  parcelamentoId: string;
  descricao: string;
  total: number;
  pagas: number;
  pendenteCents: number;
  parcelas: ParcelaItem[];
  hoje: string;
};

/** Mostra o resultado de uma acao como toast, sem setState em efeito. */
function useActionToast(state: { success?: boolean; message?: string }) {
  const { showToast } = useToast();
  const sucesso = state.success ? state.message : undefined;
  const erro = !state.success ? state.message : undefined;

  useEffect(() => {
    if (sucesso) showToast("success", sucesso);
  }, [sucesso, showToast]);

  useEffect(() => {
    if (erro) showToast("danger", erro);
  }, [erro, showToast]);
}

function ParcelaLinha({
  parcela,
  total,
  hoje,
}: {
  parcela: ParcelaItem;
  total: number;
  hoje: string;
}) {
  const [editando, setEditando] = useState(false);

  const [desfazerState, desfazerAction, desfazendo] = useActionState(
    unpayInstallmentAction,
    {},
  );
  const [editarState, editarAction, editandoPending] = useActionState(
    updateInstallmentAction,
    {},
  );

  useActionToast(desfazerState);
  useActionToast(editarState);

  // Fecha a edicao quando ela conclui, derivado do estado.
  const [salvouEm, setSalvouEm] = useState(false);
  if (editarState.success && !salvouEm) {
    setSalvouEm(true);
    setEditando(false);
  }

  const atrasada = !parcela.paga && parcela.vencimento < hoje;

  return (
    <li className="border-b border-border py-2 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
              parcela.paga
                ? "bg-success-surface text-success"
                : "border border-border text-muted",
            )}
            aria-hidden="true"
          >
            {parcela.paga ? <Check className="size-3" /> : parcela.numero}
          </span>

          <span className="min-w-0">
            <span className="font-medium">
              {parcela.numero}/{total}
            </span>{" "}
            <span className="tabular-nums" data-money>
              {formatBRL(parcela.valorCents)}
            </span>
            <span
              className={cn(
                "ml-2 text-xs",
                atrasada ? "font-medium text-danger" : "text-muted",
              )}
            >
              {parcela.paga
                ? `paga em ${parcela.pagamentoLabel ?? parcela.vencimentoLabel}`
                : `${atrasada ? "venceu" : "vence"} em ${parcela.vencimentoLabel}`}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {parcela.paga ? (
            <form action={desfazerAction}>
              <input
                type="hidden"
                name="transaction_id"
                value={parcela.id}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={desfazendo}
                title="Desfazer pagamento e devolver ao caixa"
              >
                {desfazendo ? (
                  <Spinner label="Desfazendo" />
                ) : (
                  <Undo2 className="size-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">Desfazer</span>
              </Button>
            </form>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditando((aberto) => !aberto)}
                aria-expanded={editando}
                title="Editar valor e vencimento"
              >
                <Pencil className="size-4" aria-hidden="true" />
                <span className="sr-only">Editar parcela {parcela.numero}</span>
              </Button>

              <PayInstallmentButton
                transactionId={parcela.id}
                hoje={hoje}
                label="Pagar"
              />
            </>
          )}
        </span>
      </div>

      {editando ? (
        <form
          action={editarAction}
          className="mt-2 grid gap-2 rounded-md bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <input type="hidden" name="transaction_id" value={parcela.id} />

          <Field id={`valor-${parcela.id}`} label="Valor">
            <MoneyInput
              name="valor"
              defaultValueCents={parcela.valorCents}
              {...fieldAria(`valor-${parcela.id}`, {})}
            />
          </Field>

          <Field id={`venc-${parcela.id}`} label="Vencimento">
            <Input
              name="vencimento"
              type="date"
              defaultValue={parcela.vencimento}
              {...fieldAria(`venc-${parcela.id}`, {})}
            />
          </Field>

          <Button type="submit" disabled={editandoPending}>
            {editandoPending ? <Spinner label="Salvando" /> : null}
            {editandoPending ? "..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export function InstallmentPlanCard({
  parcelamentoId,
  descricao,
  total,
  pagas,
  pendenteCents,
  parcelas,
  hoje,
}: InstallmentPlanCardProps) {
  const [renomeando, setRenomeando] = useState(false);
  const [state, renameAction, pending] = useActionState(
    renameInstallmentPlanAction,
    {},
  );

  useActionToast(state);

  const [renomeou, setRenomeou] = useState(false);
  if (state.success && !renomeou) {
    setRenomeou(true);
    setRenomeando(false);
  }

  return (
    <div className="rounded-md bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-graphite-dark">
            {descricao}
          </p>
          <p className="text-xs text-muted">
            {pagas} de {total} pagas · falta{" "}
            <span className="tabular-nums">{formatBRL(pendenteCents)}</span>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRenomeando((aberto) => !aberto)}
          aria-expanded={renomeando}
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Renomear</span>
        </Button>
      </div>

      {renomeando ? (
        <form action={renameAction} className="mt-2 flex gap-2">
          <input
            type="hidden"
            name="parcelamento_id"
            value={parcelamentoId}
          />
          <Input
            name="descricao"
            defaultValue={descricao}
            maxLength={200}
            aria-label="Nova descricao da compra parcelada"
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? <Spinner label="Salvando" /> : null}
            {pending ? "..." : "Salvar"}
          </Button>
        </form>
      ) : null}

      <ul className="mt-2">
        {parcelas.map((parcela) => (
          <ParcelaLinha
            key={parcela.id}
            parcela={parcela}
            total={total}
            hoje={hoje}
          />
        ))}
      </ul>
    </div>
  );
}
