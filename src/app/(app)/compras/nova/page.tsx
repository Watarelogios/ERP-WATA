import type { Metadata } from "next";

import { OpportunityForm } from "@/app/(app)/compras/opportunity-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { listSupplierOptions } from "@/lib/queries/contacts";

export const metadata: Metadata = {
  title: "Nova oportunidade",
};

export default async function NovaOportunidadePage() {
  await requireUser();

  const suppliers = await listSupplierOptions();

  return (
    <>
      <PageHeader
        title="Nova oportunidade"
        description="Registre a negociacao. Nada entra no estoque nem no caixa ate a compra ser confirmada."
      />

      <div className="max-w-2xl">
        <OpportunityForm suppliers={suppliers} />
      </div>
    </>
  );
}
