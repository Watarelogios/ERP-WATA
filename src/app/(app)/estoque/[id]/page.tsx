import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelReservationDialog } from "@/components/domain/cancel-reservation-dialog";
import { PhotoManager } from "@/components/domain/photo-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { requireUser } from "@/lib/auth/dal";
import {
  CONSIGNMENT_MODE,
  MOVEMENT_TYPE,
  WATCH_STATUS,
  WATCH_TYPE,
} from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import { getActiveReservationForWatch } from "@/lib/queries/reservations";
import { getWatch } from "@/lib/queries/watches";
import { signPhotoUrls } from "@/lib/storage/photos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Relogio",
};

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Recife",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});

function money(value: number | null): string {
  return value === null ? "—" : formatBRL(toCents(value));
}

export default async function RelogioPage(props: PageProps<"/estoque/[id]">) {
  await requireUser();

  const { id } = await props.params;
  const { nova, caixa } = await props.searchParams;

  const watch = await getWatch(id);

  if (!watch) {
    notFound();
  }

  // So consulta a reserva quando o relogio esta de fato reservado.
  const activeReservation =
    watch.status === "RESERVED"
      ? await getActiveReservationForWatch(watch.id)
      : null;

  const supabase = await createSupabaseServerClient();
  const photoUrls = await signPhotoUrls(
    supabase,
    watch.photos.map((photo) => photo.storage_path),
  );

  const specs: Array<{ label: string; value: string }> = [
    { label: "Referencia", value: watch.referencia ?? "—" },
    { label: "Ano", value: watch.ano ? String(watch.ano) : "—" },
    {
      label: "Movimento",
      value: watch.movimento ? MOVEMENT_TYPE[watch.movimento].label : "—",
    },
    {
      label: "Diametro",
      value: watch.diametro_mm ? `${watch.diametro_mm} mm` : "—",
    },
    { label: "Mostrador", value: watch.mostrador ?? "—" },
    { label: "Condicao", value: watch.condicao ?? "—" },
    {
      label: "Entrada",
      value: DATE_FORMAT.format(new Date(`${watch.data_entrada}T12:00:00`)),
    },
    { label: "Fornecedor", value: watch.supplier?.nome ?? "—" },
  ];

  return (
    <>
      <PageHeader
        title={`${watch.marca} ${watch.modelo}`}
        description={watch.wata_id}
        action={
          <span className="flex items-center gap-2">
            <StatusChip status={WATCH_TYPE[watch.tipo]} hideDot />
            <StatusChip status={WATCH_STATUS[watch.status]} />
          </span>
        }
      />

      {nova === "1" ? (
        <Alert tone="success" title="Relogio cadastrado" className="mb-4">
          Codigo {watch.wata_id} gerado.{" "}
          {/* Confirma o efeito no caixa: operacao financeira nao pode ser silenciosa. */}
          {caixa === "1" && watch.valor_compra !== null ? (
            <>
              A saida de {money(watch.valor_compra)} foi lancada no caixa.{" "}
            </>
          ) : null}
          Agora adicione as fotos — a primeira vira a capa automaticamente.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoManager
                watchId={watch.id}
                photos={watch.photos.map((photo) => ({
                  id: photo.id,
                  url: photoUrls.get(photo.storage_path) ?? null,
                  alt:
                    photo.alt_text ??
                    `${watch.marca} ${watch.modelo} - ${watch.wata_id}`,
                  isCover: photo.is_cover,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Especificacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt className="text-xs text-muted">{spec.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              {watch.observacoes ? (
                <p className="mt-4 whitespace-pre-line border-t border-border pt-3 text-sm text-muted">
                  {watch.observacoes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historico</CardTitle>
            </CardHeader>
            <CardContent>
              {watch.history.length === 0 ? (
                <p className="text-sm text-muted">
                  As mudancas de status (reserva, venda, cancelamento) aparecem
                  aqui.
                </p>
              ) : (
                <ol className="space-y-3">
                  {watch.history.map((event) => (
                    <li key={event.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-graphite" />
                      <span className="min-w-0">
                        <span className="font-medium">
                          {event.status_anterior
                            ? `${WATCH_STATUS[event.status_anterior].label} → `
                            : ""}
                          {WATCH_STATUS[event.status_novo].label}
                        </span>
                        {event.motivo ? (
                          <span className="text-muted"> · {event.motivo}</span>
                        ) : null}
                        <time
                          dateTime={event.created_at}
                          className="block text-xs text-muted"
                        >
                          {DATETIME_FORMAT.format(new Date(event.created_at))}
                        </time>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                {watch.tipo === "OWNED" ? (
                  <div className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted">Valor de compra</dt>
                    <dd className="font-medium tabular-nums" data-money>
                      {money(watch.valor_compra)}
                    </dd>
                  </div>
                ) : null}

                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted">Valor anunciado</dt>
                  <dd className="font-medium tabular-nums" data-money>
                    {money(watch.valor_anunciado)}
                  </dd>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted">Valor minimo</dt>
                  <dd className="font-medium tabular-nums" data-money>
                    {money(watch.valor_minimo)}
                  </dd>
                </div>

                {watch.valor_vendido !== null ? (
                  <div className="flex justify-between gap-3 border-t border-border pt-2.5 text-sm">
                    <dt className="text-muted">Valor vendido</dt>
                    <dd className="font-semibold tabular-nums" data-money>
                      {money(watch.valor_vendido)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {watch.consignment ? (
            <Card>
              <CardHeader>
                <CardTitle>Consignacao</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Modalidade</dt>
                    <dd className="font-medium">
                      {CONSIGNMENT_MODE[watch.consignment.modalidade].label}
                    </dd>
                  </div>

                  {watch.consignment.valor_repasse_fixo !== null ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Repasse fixo</dt>
                      <dd className="font-medium tabular-nums" data-money>
                        {money(watch.consignment.valor_repasse_fixo)}
                      </dd>
                    </div>
                  ) : null}

                  {watch.consignment.percentual_wata !== null ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Comissao da WATA</dt>
                      <dd className="font-medium tabular-nums">
                        {watch.consignment.percentual_wata}%
                      </dd>
                    </div>
                  ) : null}

                  {watch.consignment.prazo ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Prazo</dt>
                      <dd className="font-medium">
                        {DATE_FORMAT.format(
                          new Date(`${watch.consignment.prazo}T12:00:00`),
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Acoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/estoque/${watch.id}/editar`}
                className="block rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-graphite hover:bg-surface"
              >
                Editar cadastro
              </Link>

              {/* Reservar so faz sentido para item disponivel. */}
              {watch.status === "AVAILABLE" ? (
                <Link
                  href={`/estoque/${watch.id}/reservar`}
                  className="block rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-graphite hover:bg-surface"
                >
                  Reservar
                </Link>
              ) : null}

              {watch.status === "RESERVED" && activeReservation ? (
                <div className="rounded-md border border-border bg-surface p-3">
                  <p className="text-xs text-muted">Reservado para</p>
                  <p className="text-sm font-medium text-graphite-dark">
                    {activeReservation.client?.nome ?? "Cliente removido"}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Combinado</dt>
                      <dd className="tabular-nums" data-money>
                        {formatBRL(toCents(activeReservation.valor_combinado))}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Saldo restante</dt>
                      <dd className="font-medium tabular-nums" data-money>
                        {formatBRL(toCents(activeReservation.saldo_restante))}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3">
                    <CancelReservationDialog
                      reservationId={activeReservation.id}
                      valorSinalCents={toCents(activeReservation.valor_sinal)}
                      subject={`${watch.marca} ${watch.modelo} · ${watch.wata_id}`}
                    />
                  </div>
                </div>
              ) : null}

              {/* Vender vale para disponivel e para reservado. */}
              {watch.status === "AVAILABLE" || watch.status === "RESERVED" ? (
                <Link
                  href={`/estoque/${watch.id}/vender`}
                  className="block rounded-md bg-graphite px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-graphite-dark"
                >
                  Vender
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
