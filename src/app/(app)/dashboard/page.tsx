import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { redirect } from "next/navigation";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { getSettings } from "@/lib/queries/settings";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  /*
   * Primeiro acesso (Secao 3): sem configuracao nao ha saldo inicial, e sem
   * saldo inicial o caixa nasce errado. A configuracao vem antes do resto.
   */
  const settings = await getSettings();

  if (!settings) {
    redirect("/configuracoes");
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Indicadores, alertas e graficos calculados a partir dos dados reais do banco."
      />

      <PhasePlaceholder
        icon={LayoutDashboard}
        title="Dashboard em construcao"
        description="Capital investido, valor de estoque, lucro realizado e caixa aparecem aqui assim que houver movimento."
        phase={8}
      />
    </>
  );
}
