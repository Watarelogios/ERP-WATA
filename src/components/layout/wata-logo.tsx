import Image from "next/image";

import logo from "@/assets/logo-wata.png";
import { cn } from "@/lib/utils/cn";

export type WataLogoProps = {
  className?: string;
  /** Lado do quadrado, em pixels CSS. */
  size?: number;
  priority?: boolean;
};

/**
 * Monograma da WATA, empacotado no projeto.
 *
 * Import estatico em vez da URL do bucket: o logo aparece antes do login, onde
 * nao ha sessao para ler `settings`. Sendo arquivo local, o Next resolve
 * largura e altura em tempo de build — sem pulo de layout — e a tela continua
 * de pe se o bucket mudar de endereco.
 *
 * O logo configurado em Configuracoes continua valendo na barra do sistema,
 * onde ja existe sessao para le-lo.
 */
export function WataLogo({ className, size = 88, priority }: WataLogoProps) {
  return (
    <Image
      src={logo}
      alt="WATA"
      width={size}
      height={size}
      priority={priority}
      className={cn("h-auto", className)}
    />
  );
}
