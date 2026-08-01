import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmPurchaseForm } from "@/app/(app)/compras/[id]/confirm-purchase-form";
import { MarkLostButton } from "@/app/(app)/compras/[id]/mark-lost-button";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import { PURCHASE_STATUS } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { listSupplierOptions } from "@/lib/queries/contacts";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { getOpportunity } from "@/lib/queries/purchases";

export const metadata: Metadata = {
  title: "Oportunidade",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function OportunidadePage({ params }: PageProps) {
  await requireUser();

  const { id } = await params;
  const opportunity = await getOpportunity(id);

  if (!opportunity) {
    notFound();
  }

  const emNegociacao = opportunity.status === "NEGOTIATING";

  const [suppliers, summary] = await Promise.all([
    emNegociacao ? listSupplierOptions() : Promise.resolve([]),
    emNegociacao
      ? getDashboardSummary()
      : Promise.resolve({ caixaCents: 0 } as { caixaCents: number }),
  ]);

  return (
    <>
      <Link
        href="/compras"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-graphite"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para compras
      </Link>

      <PageHeader
        title={opportunity.modelo}
        description={
          opportunity.referencia
            ? `Referencia ${opportunity.referencia}`
            : undefined
        }
        action={
          emNegociacao ? (
            <div className="flex gap-2">
              <Link
                href={`/compras/${opportunity.id}/editar`}
                className={buttonVariants({ variant: "secondary" })}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Link>
              <MarkLostButton
                opportunityId={opportunity.id}
                modelo={opportunity.modelo}
              />
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusChip status={PURCHASE_STATUS[opportunity.status]} />

        {opportunity.watch ? (
          <Link
            href={`/estoque/${opportunity.watch.id}`}
            className="text-sm text-info underline-offset-4 hover:underline"
          >
            Ver {opportunity.watch.wata_id} no estoque
          </Link>
        ) : null}
      </div>

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Negociacao</CardTitle>
          </CardHeader>

          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Cidade</dt>
              <dd>{opportunity.cidade ?? "—"}</dd>

              <dt className="text-muted">Fornecedor</dt>
              <dd>{opportunity.supplier?.nome ?? "Nao informado"}</dd>

              <dt className="text-muted">Valor pedido</dt>
              <dd className="tabular-nums" data-money>
                {opportunity.valor_pedido === null
                  ? "—"
                  : formatBRL(toCents(opportunity.valor_pedido))}
              </dd>

              <dt className="text-muted">Minha oferta</dt>
              <dd className="tabular-nums" data-money>
                {opportunity.minha_oferta === null
                  ? "—"
                  : formatBRL(toCents(opportunity.minha_oferta))}
              </dd>

              {opportunity.valor_fechado !== null ? (
                <>
                  <dt className="text-muted">Valor fechado</dt>
                  <dd className="font-medium tabular-nums" data-money>
                    {formatBRL(toCents(opportunity.valor_fechado))}
                  </dd>
                </>
              ) : null}

              <dt className="text-muted">Contato em</dt>
              <dd>{opportunity.data_contato}</dd>
            </dl>

            {opportunity.notas ? (
              <p className="mt-4 whitespace-pre-wrap border-t border-border pt-3 text-sm text-graphite-dark">
                {opportunity.notas}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {emNegociacao ? (
          <ConfirmPurchaseForm
            opportunity={opportunity}
            suppliers={suppliers}
            caixaAtualCents={summary.caixaCents}
          />
        ) : opportunity.status === "PURCHASED" ? (
          <Alert tone="success" title="Compra confirmada">
            O relogio entrou no estoque e a saida foi lancada no caixa. Esta
            oportunidade nao pode mais ser editada.
          </Alert>
        ) : (
          <Alert tone="info" title="Negociacao encerrada">
            Marcada como perdida. Nenhum valor foi lancado no caixa.
          </Alert>
        )}
      </div>
    </>
  );
}
