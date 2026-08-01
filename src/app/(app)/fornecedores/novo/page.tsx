import type { Metadata } from "next";

import { SupplierForm } from "@/app/(app)/fornecedores/supplier-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Novo fornecedor",
};

export default async function NovoFornecedorPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Novo fornecedor"
        description="Vendedores oferecem pecas; consignantes deixam pecas para a WATA vender."
      />

      <div className="max-w-2xl">
        <SupplierForm />
      </div>
    </>
  );
}
