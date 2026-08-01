import type { Metadata } from "next";

import { WatchForm } from "@/app/(app)/estoque/novo/watch-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { listSupplierOptions } from "@/lib/queries/contacts";

export const metadata: Metadata = {
  title: "Novo relogio",
};

export default async function NovoRelogioPage() {
  await requireUser();

  const suppliers = await listSupplierOptions();

  return (
    <>
      <PageHeader
        title="Novo relogio"
        description="Preencha a identificacao e os valores; as fotos entram na etapa seguinte."
      />

      <div className="max-w-2xl">
        <WatchForm suppliers={suppliers} />
      </div>
    </>
  );
}
