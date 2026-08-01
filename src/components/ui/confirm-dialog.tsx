"use client";

import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/cn";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** O que sera afetado. Ex.: "Rolex Submariner - WATA-0007". */
  subject: string;
  title: string;
  /** A consequencia, em uma frase. O usuario decide sabendo o que acontece. */
  description: ReactNode;
  /** Valores envolvidos, quando a acao mexe em dinheiro. */
  details?: Array<{ label: string; value: string }>;
  confirmLabel: string;
  pending?: boolean;
  destructive?: boolean;
};

/**
 * Confirmacao de acao (Secao 16.1).
 *
 * Mostra objeto, consequencia e valores; o botao descreve a acao em vez de
 * dizer apenas "OK". Operacoes financeiras exigem confirmacao explicita
 * (Secao 15.2).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  subject,
  title,
  description,
  details,
  confirmLabel,
  pending,
  destructive,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pending]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-graphite-dark/40"
        onClick={() => !pending && onClose()}
        aria-label="Cancelar"
        tabIndex={-1}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-md rounded-card border border-border bg-white p-5"
      >
        <h2 id="confirm-title" className="text-base font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm font-medium text-graphite-dark">{subject}</p>

        <div id="confirm-description" className="mt-2 text-sm text-muted">
          {description}
        </div>

        {details?.length ? (
          <dl className="mt-4 space-y-1.5 rounded-md bg-surface p-3">
            {details.map((item) => (
              <div key={item.label} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted">{item.label}</dt>
                <dd className="font-medium tabular-nums" data-money>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="sm:w-auto"
          >
            Cancelar
          </Button>

          {/* Foco inicial na acao, nao no cancelar: o dialogo ja explicou tudo. */}
          <Button
            autoFocus
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={pending}
            className={cn("sm:w-auto")}
          >
            {pending ? <Spinner label="Processando" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
