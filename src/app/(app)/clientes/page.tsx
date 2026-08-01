import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Clientes",
};

export default async function ClientesPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Contatos, interesses, reservas, creditos e compras."
      />

      <PhasePlaceholder
        icon={Users}
        title="Clientes em construcao"
        description="Nenhum cliente cadastrado. O historico de cada cliente e montado a partir das reservas e vendas."
        phase={3}
      />
    </>
  );
}
