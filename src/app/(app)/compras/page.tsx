import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Compras",
};

export default async function ComprasPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Compras"
        description="Pipeline de oportunidades e conversao atomica em compra."
      />

      <PhasePlaceholder
        icon={Handshake}
        title="Compras em construcao"
        description="Nenhuma oportunidade em negociacao. Ao confirmar uma compra, o relogio entra no estoque e a saida e lancada no caixa."
        phase={4}
      />
    </>
  );
}
