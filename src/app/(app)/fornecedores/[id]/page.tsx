import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SupplierForm } from "@/app/(app)/fornecedores/supplier-form";
import { ActiveToggle } from "@/components/domain/active-toggle";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/dal";
import { setSupplierActiveAction } from "@/lib/actions/contacts";
import { getSupplier } from "@/lib/queries/contacts";

export const metadata: Metadata = {
  title: "Fornecedor",
};

export default async function FornecedorPage(
  props: PageProps<"/fornecedores/[id]">,
) {
  await requireUser();

  const { id } = await props.params;
  const supplier = await getSupplier(id);

  if (!supplier) {
    notFound();
  }

  const toggleAction = setSupplierActiveAction.bind(null, supplier.id);

  return (
    <>
      <PageHeader
        title={supplier.nome}
        description="Itens vinculados e repasses deste fornecedor aparecem aqui nas proximas fases."
        action={
          <ActiveToggle
            subject={supplier.nome}
            ativo={supplier.ativo}
            action={toggleAction}
            deactivateConsequence="O fornecedor some das listas padrao e dos selects de origem e consignacao. Relogios e repasses ja vinculados permanecem intactos."
          />
        }
      />

      <div className="max-w-2xl space-y-4">
        {!supplier.ativo ? (
          <Alert tone="warning" title="Fornecedor inativo">
            Este cadastro nao aparece nas listas padrao. Reative para vincula-lo
            a novos relogios.
          </Alert>
        ) : null}

        <SupplierForm supplier={supplier} />
      </div>
    </>
  );
}
