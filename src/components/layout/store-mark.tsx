"use client";

import { useState } from "react";

import { WataMark } from "@/components/layout/wata-mark";
import { cn } from "@/lib/utils/cn";

export type StoreMarkProps = {
  logoUrl: string | null;
  nomeLoja: string;
  className?: string;
  /** Altura maxima do logo; o texto usa o tamanho correspondente. */
  size?: "sm" | "md";
};

/**
 * Marca da loja: logo configurado, ou a marca tipografica.
 *
 * Se a imagem falhar (URL errada, bucket privado, arquivo removido), cai de
 * volta para o texto em vez de deixar um icone quebrado permanente na
 * navegacao — o logo e decorativo, a navegacao nao pode depender dele.
 */
export function StoreMark({
  logoUrl,
  nomeLoja,
  className,
  size = "md",
}: StoreMarkProps) {
  const [falhou, setFalhou] = useState(false);

  if (!logoUrl || falhou) {
    return (
      <WataMark
        className={cn(size === "sm" && "text-base", className)}
      />
    );
  }

  return (
    /*
     * `img` em vez de `next/image`: a URL vem da configuracao do usuario e pode
     * apontar para qualquer host, enquanto o otimizador exige uma lista de
     * dominios conhecida em tempo de build.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={nomeLoja}
      onError={() => setFalhou(true)}
      className={cn(
        "w-auto object-contain",
        size === "sm" ? "max-h-7" : "max-h-9",
        className,
      )}
    />
  );
}
