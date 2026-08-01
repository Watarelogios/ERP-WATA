import type { LabelEntry, Tone } from "@/lib/labels";
import { cn } from "@/lib/utils/cn";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-surface text-graphite",
  success: "border-success/30 bg-success-surface text-success",
  warning: "border-warning/30 bg-warning-surface text-warning",
  danger: "border-danger/30 bg-danger-surface text-danger",
  info: "border-info/30 bg-info-surface text-info",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export type StatusChipProps = {
  status: LabelEntry;
  className?: string;
  /** Oculta o ponto quando o contexto ja deixa o estado obvio. */
  hideDot?: boolean;
};

/**
 * Estado sempre comunicado por texto + ponto, nunca apenas por cor (Secao 15.1).
 *
 * Quem nao distingue verde de ambar continua lendo "Disponivel" ou "Reservado".
 */
export function StatusChip({ status, className, hideDot }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[status.tone],
        className,
      )}
      title={status.hint}
    >
      {hideDot ? null : (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[status.tone])}
          aria-hidden="true"
        />
      )}
      {status.label}
    </span>
  );
}
