import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Configuracoes",
};

export default async function ConfiguracoesPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Configuracoes"
        description="Dados da loja, saldo inicial, canais de venda e categorias."
      />

      <PhasePlaceholder
        icon={Settings}
        title="Configuracoes em construcao"
        description="A configuracao inicial da WATA define o saldo de caixa de partida e os canais de venda usados nos relatorios."
        phase={3}
      />
    </>
  );
}
