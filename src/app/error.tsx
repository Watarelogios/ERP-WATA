"use client";

import { useEffect } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Erro recuperavel em linguagem simples com opcao de tentar novamente
 * (Secao 16.2). O detalhe tecnico fica no console do servidor, nao na tela.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[wata] erro nao tratado", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-4 rounded-card border border-border bg-white p-6">
        <Alert tone="danger" title="Algo deu errado">
          Nao foi possivel carregar esta tela. Nenhuma operacao financeira foi
          concluida.
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} block>
            Tentar novamente
          </Button>
        </div>

        {error.digest ? (
          <p className="text-xs text-muted">
            Codigo para suporte: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
