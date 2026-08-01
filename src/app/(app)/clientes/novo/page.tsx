import type { Metadata } from "next";

import { ClientForm } from "@/app/(app)/clientes/client-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Novo cliente",
};

export default async function NovoClientePage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Novo cliente"
        description="Somente o nome e obrigatorio; o restante pode ser completado depois."
      />

      <div className="max-w-2xl">
        <ClientForm />
      </div>
    </>
  );
}
