import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Vendas",
};

export default async function VendasPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Historico de vendas com cliente, valor, lucro e origem."
      />

      <PhasePlaceholder
        icon={Receipt}
        title="Vendas em construcao"
        description="Nenhuma venda registrada. A venda a vista preserva o historico do relogio e gera o repasse quando o item e consignado."
        phase={6}
      />
    </>
  );
}
