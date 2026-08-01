import type { ReactNode } from "react";

import { WataMark } from "@/components/layout/wata-mark";

/**
 * Layout das telas publicas.
 *
 * Nenhum dado comercial aparece antes da autenticacao (Secao 15): so a marca,
 * o formulario e o texto de apoio.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <WataMark className="text-2xl" />
            <p className="mt-2 text-sm text-muted">Gestao de relogios</p>
          </div>

          {children}
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-muted">
        Acesso restrito a administracao da WATA.
      </footer>
    </div>
  );
}
