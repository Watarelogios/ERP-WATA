"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "danger";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  showToast: (tone: ToastTone, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Duracao suficiente para ler uma frase sem apressar o usuario. */
const AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();

      setToasts((current) => [...current, { id, tone, message }]);

      /*
       * Erro nao some sozinho: se a operacao falhou, o usuario precisa ler a
       * mensagem inteira e decidir o que fazer (Secao 16.1).
       */
      if (tone === "success") {
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // aria-live avisa o leitor de tela sem roubar o foco.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CircleCheck : CircleX;

          return (
            <div
              key={toast.id}
              role={toast.tone === "danger" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border bg-white px-4 py-3 text-sm shadow-sm",
                toast.tone === "success"
                  ? "border-success/30"
                  : "border-danger/30",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  toast.tone === "success" ? "text-success" : "text-danger",
                )}
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 break-words text-graphite-dark">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 shrink-0 rounded p-1 text-muted hover:text-graphite"
                aria-label="Fechar aviso"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  }

  return context;
}
