import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

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
