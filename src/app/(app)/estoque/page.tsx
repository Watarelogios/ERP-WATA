import type { Metadata } from "next";
import { Watch } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Estoque",
};

export default async function EstoquePage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Relogios proprios e consignados, com fotos, filtros e acoes rapidas."
      />

      <PhasePlaceholder
        icon={Watch}
        title="Estoque em construcao"
        description="Nenhum relogio cadastrado ainda. O primeiro item recebe automaticamente o codigo WATA-0001."
        phase={3}
      />
    </>
  );
}
