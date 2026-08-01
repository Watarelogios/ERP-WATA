"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, NAV_ITEMS } from "@/components/layout/nav-items";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { WataMark } from "@/components/layout/wata-mark";

function useSectionTitle() {
  const pathname = usePathname();

  return (
    NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label ?? "WATA"
  );
}

export function AppHeader({ userEmail }: { userEmail: string }) {
  const title = useSectionTitle();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white px-4 sm:px-6">
      {/* No celular a marca substitui a sidebar como atalho para o inicio. */}
      <Link
        href="/dashboard"
        className="lg:hidden"
        aria-label="Ir para o dashboard"
      >
        <WataMark className="text-base" />
      </Link>

      <h1 className="truncate text-base font-semibold lg:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="hidden max-w-[16rem] truncate text-sm text-muted sm:block"
          title={userEmail}
        >
          {userEmail}
        </span>

        <SignOutButton />
      </div>
    </header>
  );
}
