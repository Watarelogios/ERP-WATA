import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SaleForm } from "@/app/(app)/estoque/[id]/vender/sale-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { listClientOptions } from "@/lib/queries/contacts";
import { getActiveReservationForWatch } from "@/lib/queries/reservations";
import { getSaleChannels } from "@/lib/queries/settings";
import { getWatch } from "@/lib/queries/watches";
import { hojeISO } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Vender",
};

type PageProps = { params: Promise<{ id: string }> };

/** Repasse devido ao consignante, para prever a comissao antes de confirmar. */
function repasseEstimado(
  valorVendaCents: number,
  consignment: {
    modalidade: "FIXED_PAYOUT" | "WATA_PERCENTAGE";
    valor_repasse_fixo: number | null;
    percentual_wata: number | null;
  } | null,
): number | null {
  if (!consignment) {
    return null;
  }

  if (consignment.modalidade === "FIXED_PAYOUT") {
    return toCents(consignment.valor_repasse_fixo ?? 0);
  }

  const comissao = Math.round(
    (valorVendaCents * (consignment.percentual_wata ?? 0)) / 100,
  );

  return valorVendaCents - comissao;
}

export default async function VenderPage({ params }: PageProps) {
  await requireUser();

  const { id } = await params;
  const watch = await getWatch(id);

  if (!watch) {
    notFound();
  }

  // Vendido ou removido nao volta para a tela de venda.
  if (watch.status !== "AVAILABLE" && watch.status !== "RESERVED") {
    redirect(`/estoque/${id}`);
  }

  const [clients, canais, reservation] = await Promise.all([
    listClientOptions(),
    getSaleChannels(),
    watch.status === "RESERVED"
      ? getActiveReservationForWatch(watch.id)
      : Promise.resolve(null),
  ]);

  const valorSugeridoCents =
    watch.valor_anunciado === null ? null : toCents(watch.valor_anunciado);

  const baseParaRepasse =
    reservation !== null
      ? toCents(reservation.valor_combinado)
      : (valorSugeridoCents ?? 0);

  return (
    <>
      <Link
        href={`/estoque/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-graphite"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para o relogio
      </Link>

      <PageHeader
        title="Confirmar venda"
        description={`${watch.marca} ${watch.modelo} · ${watch.wata_id}`}
      />

      <div className="max-w-2xl">
        <SaleForm
          watchId={watch.id}
          watchLabel={`${watch.marca} ${watch.modelo} · ${watch.wata_id}`}
          tipo={watch.tipo}
          valorSugeridoCents={valorSugeridoCents}
          valorCompraCents={
            watch.valor_compra === null ? null : toCents(watch.valor_compra)
          }
          repasseEstimadoCents={repasseEstimado(
            baseParaRepasse,
            watch.consignment,
          )}
          clients={clients}
          canais={canais}
          hoje={hojeISO()}
          reserva={
            reservation && reservation.client
              ? {
                  clientId: reservation.client.id,
                  clientNome: reservation.client.nome,
                  sinalCents: toCents(reservation.valor_sinal),
                  combinadoCents: toCents(reservation.valor_combinado),
                }
              : null
          }
        />
      </div>
    </>
  );
}
