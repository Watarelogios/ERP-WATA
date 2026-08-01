import { Watch } from "lucide-react";
import Link from "next/link";

import { StatusChip } from "@/components/ui/status-chip";
import { WATCH_STATUS, WATCH_TYPE } from "@/lib/labels";
import { formatBRL, toCents } from "@/lib/money";
import type { WatchListRow } from "@/lib/queries/watches";

export type WatchCardProps = {
  watch: WatchListRow;
  /** URL assinada da capa; sem foto, o placeholder assume. */
  coverUrl: string | null;
};

/**
 * Card do relogio (Secao 16.1): foto 4:3, WATA-ID, marca/modelo, preco, tipo,
 * status e link para o detalhe. Usado na listagem em celular.
 */
export function WatchCard({ watch, coverUrl }: WatchCardProps) {
  const price =
    watch.status === "SOLD" ? watch.valor_vendido : watch.valor_anunciado;

  return (
    <Link
      href={`/estoque/${watch.id}`}
      className="block overflow-hidden rounded-card border border-border bg-white transition-colors hover:border-graphite"
    >
      <div className="relative aspect-[4/3] bg-surface">
        {coverUrl ? (
          // Signed URL de curta duracao: next/image nao cachearia bem aqui.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${watch.marca} ${watch.modelo} - ${watch.wata_id}`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <Watch className="size-10 text-border" aria-hidden="true" />
            <span className="sr-only">Sem foto</span>
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tabular-nums text-muted">
            {watch.wata_id}
          </span>
          <StatusChip status={WATCH_STATUS[watch.status]} />
        </div>

        <p className="truncate text-sm font-semibold text-graphite-dark">
          {watch.marca} {watch.modelo}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums" data-money>
            {price !== null ? formatBRL(toCents(price)) : "Sem preco"}
          </span>
          <StatusChip status={WATCH_TYPE[watch.tipo]} hideDot />
        </div>
      </div>
    </Link>
  );
}
