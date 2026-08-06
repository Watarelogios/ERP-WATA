import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/queries/settings";

/**
 * Layout autenticado.
 *
 * A checagem aqui garante o e-mail exibido no header, mas nao substitui a
 * verificacao em cada pagina e Server Action: layouts nao re-renderizam a cada
 * navegacao (renderizacao parcial), entao a autorizacao real fica junto do dado.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  // Sem configuracao ainda (primeiro acesso), a marca tipografica cobre.
  const settings = await getSettings();

  return (
    <AppShell
      userEmail={user.email ?? "Administrador"}
      nomeLoja={settings?.nomeLoja ?? "WATA"}
      logoUrl={settings?.logoUrl ?? null}
    >
      {children}
    </AppShell>
  );
}
