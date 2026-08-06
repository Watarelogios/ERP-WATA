import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export type AppShellProps = {
  userEmail: string;
  nomeLoja: string;
  logoUrl: string | null;
  children: ReactNode;
};

/**
 * Estrutura das telas autenticadas: sidebar fixa no desktop, header no topo e
 * barra inferior no celular.
 */
export function AppShell({
  userEmail,
  nomeLoja,
  logoUrl,
  children,
}: AppShellProps) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-surface">
        <Sidebar nomeLoja={nomeLoja} logoUrl={logoUrl} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            userEmail={userEmail}
            nomeLoja={nomeLoja}
            logoUrl={logoUrl}
          />

          {/* pb-20 no celular reserva espaco para a barra inferior fixa. */}
          <main className="flex-1 px-4 pb-20 pt-5 sm:px-6 lg:pb-8">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </ToastProvider>
  );
}
