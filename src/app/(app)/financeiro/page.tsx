import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Financeiro",
};

export default async function FinanceiroPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Saldo, entradas, saidas, pendencias e estornos."
      />

      <PhasePlaceholder
        icon={Wallet}
        title="Financeiro em construcao"
        description="Nenhum lancamento no periodo. O saldo e sempre saldo inicial mais entradas confirmadas menos saidas confirmadas."
        phase={7}
      />
    </>
  );
}
