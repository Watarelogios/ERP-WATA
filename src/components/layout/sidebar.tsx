"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StoreMark } from "@/components/layout/store-mark";
import { isActivePath, NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils/cn";

/**
 * Sidebar fixa do desktop.
 *
 * Todos os modulos ficam visiveis: no desktop nenhuma funcao essencial e
 * escondida atras de menu (Secao 16).
 */
export function Sidebar({
  nomeLoja,
  logoUrl,
}: {
  nomeLoja: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard" aria-label="Ir para o dashboard">
          <StoreMark nomeLoja={nomeLoja} logoUrl={logoUrl} />
        </Link>
      </div>

      <nav aria-label="Navegacao principal" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-graphite text-white"
                      : "text-graphite hover:bg-surface",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
