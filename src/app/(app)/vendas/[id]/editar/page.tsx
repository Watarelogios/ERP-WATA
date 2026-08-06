import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditSaleForm } from "@/app/(app)/vendas/[id]/editar/edit-sale-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { listClientOptions } from "@/lib/queries/contacts";
import { getSale } from "@/lib/queries/sales";
import { getSaleChannels } from "@/lib/queries/settings";
import { getWatch } from "@/lib/queries/watches";

export const metadata: Metadata = {
  title: "Editar venda",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function EditarVendaPage({ params }: PageProps) {
  await requireUser();

  const { id } = await params;
  const sale = await getSale(id);

  if (!sale) {
    notFound();
  }

  const [clients, canais, watch] = await Promise.all([
    listClientOptions(),
    getSaleChannels(),
    getWatch(sale.watch_id),
  ]);

  /*
   * Consignado por percentual com repasse ja pago: o valor nao pode mudar,
   * porque o dinheiro do consignante saiu calculado sobre o valor antigo.
   * A RPC tambem barra isso; aqui o campo ja aparece bloqueado, com o motivo.
   */
  const valorTravado =
    sale.payout?.status === "PAID" &&
    sale.payout.modalidade === "WATA_PERCENTAGE";

  const percentualWata =
    sale.payout?.modalidade === "WATA_PERCENTAGE"
      ? (watch?.consignment?.percentual_wata ?? null)
      : null;

  const watchLabel = sale.watch
    ? `${sale.watch.marca} ${sale.watch.modelo} · ${sale.watch.wata_id}`
    : "Relogio removido";

  return (
    <>
      <Link
        href="/vendas"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-graphite"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para vendas
      </Link>

      <PageHeader
        title="Editar venda"
        description={watchLabel}
      />

      <div className="max-w-2xl">
        <EditSaleForm
          saleId={sale.id}
          watchLabel={watchLabel}
          valorAtualCents={toCents(sale.valor_venda)}
          valorCompraCents={
            watch?.valor_compra == null ? null : toCents(watch.valor_compra)
          }
          sinalCents={sale.sinal_cents}
          origem={sale.origem}
          formaPagamento={sale.forma_pagamento}
          dataVenda={sale.data_venda}
          clientId={sale.client_id}
          clients={clients}
          canais={canais}
          clienteTravado={sale.reservation_id !== null}
          valorTravado={valorTravado}
          percentualWata={percentualWata}
        />
      </div>
    </>
  );
}
