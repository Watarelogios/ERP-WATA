import type { Metadata } from "next";
import { BookmarkCheck } from "lucide-react";

import { PhasePlaceholder } from "@/components/domain/phase-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Reservas",
};

export default async function ReservasPage() {
  // Autorizacao junto do dado, nao apenas no layout.
  await requireUser();

  return (
    <>
      <PageHeader
        title="Reservas"
        description="Reservas ativas, proximas do vencimento e historico."
      />

      <PhasePlaceholder
        icon={BookmarkCheck}
        title="Reservas em construcao"
        description="Nenhuma reserva ativa. A reserva bloqueia o relogio e registra o sinal, quando houver."
        phase={5}
      />
    </>
  );
}
