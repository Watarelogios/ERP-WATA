import type { Metadata } from "next";
import { Truck } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Fornecedores",
};

export default async function FornecedoresPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Vendedores, consignantes, itens vinculados e repasses."
      />

      <PhasePlaceholder
        icon={Truck}
        title="Fornecedores em construcao"
        description="Nenhum fornecedor cadastrado. Consignantes tambem sao cadastrados aqui."
        phase={3}
      />
    </>
  );
}
