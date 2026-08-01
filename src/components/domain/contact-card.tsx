import { AtSign, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import type { LabelEntry } from "@/lib/labels";

export type ContactCardProps = {
  href: string;
  nome: string;
  cidade: string | null;
  telefone: string | null;
  instagram: string | null;
  chip?: LabelEntry;
  inativo?: boolean;
  extra?: ReactNode;
};

/** Card de contato usado nas listas de clientes e fornecedores no celular. */
export function ContactCard({
  href,
  nome,
  cidade,
  telefone,
  instagram,
  chip,
  inativo,
  extra,
}: ContactCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={href}
          className="min-w-0 text-sm font-semibold text-graphite-dark hover:underline"
        >
          {nome}
        </Link>

        <span className="flex shrink-0 items-center gap-1.5">
          {inativo ? (
            <StatusChip
              status={{ label: "Inativo", tone: "neutral" }}
              hideDot
            />
          ) : null}
          {chip ? <StatusChip status={chip} /> : null}
        </span>
      </div>

      <dl className="mt-2 space-y-1 text-sm text-muted">
        {cidade ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Cidade</dt>
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate">{cidade}</dd>
          </div>
        ) : null}

        {telefone ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Telefone</dt>
            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate tabular-nums">{telefone}</dd>
          </div>
        ) : null}

        {instagram ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Instagram</dt>
            <AtSign className="size-3.5 shrink-0" aria-hidden="true" />
            <dd className="truncate">@{instagram}</dd>
          </div>
        ) : null}
      </dl>

      {extra}
    </Card>
  );
}
