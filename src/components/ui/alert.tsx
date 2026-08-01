import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<
  AlertTone,
  { icon: LucideIcon; className: string; label: string }
> = {
  info: {
    icon: Info,
    className: "border-info/30 bg-info-surface text-info",
    label: "Informacao",
  },
  success: {
    icon: CircleCheck,
    className: "border-success/30 bg-success-surface text-success",
    label: "Sucesso",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-warning/30 bg-warning-surface text-warning",
    label: "Atencao",
  },
  danger: {
    icon: CircleX,
    className: "border-danger/30 bg-danger-surface text-danger",
    label: "Erro",
  },
};

export type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Estado comunicado por icone + texto, nunca apenas por cor. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: AlertProps) {
  const { icon: Icon, className: toneClassName, label } = TONES[tone];
  const isUrgent = tone === "danger" || tone === "warning";

  return (
    <div
      role={isUrgent ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
        toneClassName,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}:</span>
      {/* break-words evita que nomes tecnicos longos vazem do card. */}
      <div className="min-w-0 flex-1 break-words text-graphite-dark">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={cn(title && "mt-0.5")}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
