import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReservationForm } from "@/app/(app)/estoque/[id]/reservar/reservation-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { listClientOptions } from "@/lib/queries/contacts";
import { getWatch } from "@/lib/queries/watches";
import { emDiasISO, hojeISO } from "@/lib/utils/dates";

export const metadata: Metadata = {
  title: "Reservar",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function ReservarPage({ params }: PageProps) {
  await requireUser();

  const { id } = await params;
  const watch = await getWatch(id);

  if (!watch) {
    notFound();
  }

  /*
   * So relogio disponivel pode ser reservado. Chegar aqui com outro status
   * significa link antigo ou reserva feita em outra aba.
   */
  if (watch.status !== "AVAILABLE") {
    redirect(`/estoque/${id}`);
  }

  const clients = await listClientOptions();

  // Datas resolvidas no servidor: no cliente, `new Date()` no render e impuro.
  const hoje = hojeISO();
  const validadePadrao = emDiasISO(7);

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
        title="Criar reserva"
        description={`${watch.marca} ${watch.modelo} · ${watch.wata_id}`}
      />

      <div className="max-w-2xl">
        <ReservationForm
          watchId={watch.id}
          watchLabel={watch.wata_id}
          valorAnunciadoCents={
            watch.valor_anunciado === null
              ? null
              : toCents(watch.valor_anunciado)
          }
          clients={clients}
          hoje={hoje}
          validadePadrao={validadePadrao}
        />
      </div>
    </>
  );
}
