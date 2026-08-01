import {
  BookmarkCheck,
  Handshake,
  LayoutDashboard,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  Watch,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular; o restante fica em "Mais". */
  primaryOnMobile?: boolean;
};

/**
 * Modulos do MVP (Secao 15).
 *
 * Fonte unica para sidebar, barra inferior e titulo da pagina — assim nenhuma
 * rota nova fica orfa em uma das navegacoes.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    primaryOnMobile: true,
  },
  { href: "/estoque", label: "Estoque", icon: Watch, primaryOnMobile: true },
  { href: "/compras", label: "Compras", icon: Handshake },
  { href: "/reservas", label: "Reservas", icon: BookmarkCheck },
  { href: "/vendas", label: "Vendas", icon: Receipt, primaryOnMobile: true },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    primaryOnMobile: true,
  },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
];

export const PRIMARY_MOBILE_ITEMS = NAV_ITEMS.filter(
  (item) => item.primaryOnMobile,
);

export const SECONDARY_MOBILE_ITEMS = NAV_ITEMS.filter(
  (item) => !item.primaryOnMobile,
);

/** Marca ativo tanto a rota exata quanto suas subrotas (/estoque/[id]). */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
