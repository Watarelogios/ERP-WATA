import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  WatchForm,
  type WatchDefaults,
} from "@/app/(app)/estoque/novo/watch-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { updateWatchAction } from "@/lib/actions/watches";
import { requireUser } from "@/lib/auth/dal";
import { toCents } from "@/lib/money";
import { listSupplierOptions } from "@/lib/queries/contacts";
import { getWatch } from "@/lib/queries/watches";

export const metadata: Metadata = {
  title: "Editar relogio",
};

export default async function EditarRelogioPage(
  props: PageProps<"/estoque/[id]/editar">,
) {
  await requireUser();

  const { id } = await props.params;
  const [watch, suppliers] = await Promise.all([
    getWatch(id),
    listSupplierOptions(),
  ]);

  if (!watch) {
    notFound();
  }

  const defaults: WatchDefaults = {
    tipo: watch.tipo,
    marca: watch.marca,
    modelo: watch.modelo,
    referencia: watch.referencia,
    ano: watch.ano,
    movimento: watch.movimento,
    diametro_mm: watch.diametro_mm,
    mostrador: watch.mostrador,
    condicao: watch.condicao,
    valorCompraCents:
      watch.valor_compra !== null ? toCents(watch.valor_compra) : null,
    valorMinimoCents:
      watch.valor_minimo !== null ? toCents(watch.valor_minimo) : null,
    valorAnunciadoCents:
      watch.valor_anunciado !== null ? toCents(watch.valor_anunciado) : null,
    supplierId: watch.supplier?.id ?? null,
    dataEntrada: watch.data_entrada,
    observacoes: watch.observacoes,
    consignacao: watch.consignment
      ? {
          supplierId: watch.consignment.supplier_id,
          modalidade: watch.consignment.modalidade,
          valorFixoCents:
            watch.consignment.valor_repasse_fixo !== null
              ? toCents(watch.consignment.valor_repasse_fixo)
              : null,
          percentual: watch.consignment.percentual_wata,
          prazo: watch.consignment.prazo,
        }
      : null,
  };

  const editAction = updateWatchAction.bind(null, watch.id);

  return (
    <>
      <PageHeader
        title={`Editar ${watch.marca} ${watch.modelo}`}
        description={watch.wata_id}
      />

      <div className="max-w-2xl space-y-4">
        {watch.status === "SOLD" ? (
          <Alert tone="warning" title="Relogio vendido">
            Este item ja foi vendido. Altere os dados apenas para corrigir
            informacoes cadastrais — os valores da venda nao mudam por aqui.
          </Alert>
        ) : null}

        <WatchForm
          suppliers={suppliers}
          defaults={defaults}
          editAction={editAction}
        />
      </div>
    </>
  );
}
