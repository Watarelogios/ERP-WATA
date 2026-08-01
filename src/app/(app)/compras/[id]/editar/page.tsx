import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { OpportunityForm } from "@/app/(app)/compras/opportunity-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { listSupplierOptions } from "@/lib/queries/contacts";
import { getOpportunity } from "@/lib/queries/purchases";

export const metadata: Metadata = {
  title: "Editar oportunidade",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function EditarOportunidadePage({ params }: PageProps) {
  await requireUser();

  const { id } = await params;
  const opportunity = await getOpportunity(id);

  if (!opportunity) {
    notFound();
  }

  /*
   * Oportunidade encerrada nao volta a ser editavel: seus valores ficaram
   * amarrados ao relogio criado e ao lancamento no caixa.
   */
  if (opportunity.status !== "NEGOTIATING") {
    redirect(`/compras/${id}`);
  }

  const suppliers = await listSupplierOptions();

  return (
    <>
      <PageHeader
        title="Editar oportunidade"
        description="Ajuste os dados da negociacao. Nada entra no estoque nem no caixa aqui."
      />

      <div className="max-w-2xl">
        <OpportunityForm suppliers={suppliers} opportunity={opportunity} />
      </div>
    </>
  );
}
