import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export type PhasePlaceholderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Fase da Secao 20 em que este modulo passa a persistir dados. */
  phase: number;
};

/**
 * Marcador de modulo ainda nao implementado.
 *
 * A rota existe e ja esta protegida desde a Fase 1; o conteudo chega na fase
 * indicada. Isso deixa explicito o que falta, em vez de simular uma tela pronta.
 */
export function PhasePlaceholder({
  icon,
  title,
  description,
  phase,
}: PhasePlaceholderProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={`${description} Este modulo entra na Fase ${phase} da implementacao.`}
    />
  );
}
