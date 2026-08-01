"use client";

import { Ellipsis, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  isActivePath,
  PRIMARY_MOBILE_ITEMS,
  SECONDARY_MOBILE_ITEMS,
} from "@/components/layout/nav-items";
import { cn } from "@/lib/utils/cn";

/**
 * Navegacao do celular: barra inferior com os modulos mais usados e um painel
 * "Mais" com o restante. Cada alvo tem no minimo 44x44px (Secao 16.2).
 */
export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  /*
   * Fecha o painel ao navegar, senao ele cobre a tela de destino.
   *
   * O ajuste acontece durante a renderizacao (padrao "adjusting state when a
   * prop changes"), e nao em efeito: cobre tambem o botao voltar do navegador
   * sem provocar renderizacao em cascata.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setShowMore(false);
  }

  useEffect(() => {
    if (!showMore) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMore(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showMore]);

  const hasActiveSecondary = SECONDARY_MOBILE_ITEMS.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <>
      {showMore ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-graphite-dark/40"
            onClick={() => setShowMore(false)}
            aria-label="Fechar menu"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais modulos"
            className="absolute inset-x-0 bottom-0 rounded-t-card border-t border-border bg-white pb-[calc(4rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Mais modulos</h2>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="flex size-11 items-center justify-center rounded-md text-graphite hover:bg-surface"
                aria-label="Fechar menu"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="p-2">
              {SECONDARY_MOBILE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-touch items-center gap-3 rounded-md px-3 text-sm font-medium",
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
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navegacao principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_MOBILE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-touch flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                    active ? "text-graphite" : "text-muted",
                  )}
                >
                  <Icon
                    className={cn("size-5", active && "stroke-[2.5]")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => setShowMore((open) => !open)}
              aria-expanded={showMore}
              className={cn(
                "flex min-h-touch w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                showMore || hasActiveSecondary ? "text-graphite" : "text-muted",
              )}
            >
              <Ellipsis className="size-5" aria-hidden="true" />
              <span>Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
