import type { Metadata } from "next";

import { SettingsForm } from "@/app/(app)/configuracoes/settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/queries/settings";

export const metadata: Metadata = {
  title: "Configuracoes",
};

export default async function ConfiguracoesPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  const settings = await getSettings();
  const firstRun = settings === null;

  return (
    <>
      <PageHeader
        title={firstRun ? "Configurar a WATA" : "Configuracoes"}
        description={
          firstRun
            ? "Antes de cadastrar o primeiro relogio, defina os dados da loja e o saldo de caixa atual."
            : "Dados da loja, saldo inicial, canais de venda e categorias."
        }
      />

      <div className="max-w-2xl">
        {firstRun ? (
          <Alert tone="info" title="Primeiro acesso" className="mb-4">
            O saldo inicial e o unico numero que o sistema nao consegue deduzir
            sozinho. Todo o resto do caixa passa a ser calculado a partir das
            operacoes registradas.
          </Alert>
        ) : null}

        <SettingsForm settings={settings} firstRun={firstRun} />
      </div>
    </>
  );
}
