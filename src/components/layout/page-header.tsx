import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  description?: string;
  /** Acao primaria da tela; use no maximo uma. */
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {/* h1 fica no header do AppShell; aqui o nivel semantico e h2. */}
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
