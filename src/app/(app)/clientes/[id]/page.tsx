import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientForm } from "@/app/(app)/clientes/client-form";
import { ActiveToggle } from "@/components/domain/active-toggle";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/dal";
import { setClientActiveAction } from "@/lib/actions/contacts";
import { getClient } from "@/lib/queries/contacts";

export const metadata: Metadata = {
  title: "Cliente",
};

export default async function ClientePage(props: PageProps<"/clientes/[id]">) {
  await requireUser();

  const { id } = await props.params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const toggleAction = setClientActiveAction.bind(null, client.id);

  return (
    <>
      <PageHeader
        title={client.nome}
        description="Reservas, creditos e compras deste cliente aparecem aqui nas proximas fases."
        action={
          <ActiveToggle
            subject={client.nome}
            ativo={client.ativo}
            action={toggleAction}
            deactivateConsequence="O cliente some das listas padrao e dos selects de reserva e venda. O historico dele permanece intacto e ele pode ser reativado a qualquer momento."
          />
        }
      />

      <div className="max-w-2xl space-y-4">
        {!client.ativo ? (
          <Alert tone="warning" title="Cliente inativo">
            Este cadastro nao aparece nas listas padrao. Reative para usa-lo em
            novas reservas e vendas.
          </Alert>
        ) : null}

        <ClientForm client={client} />
      </div>
    </>
  );
}
