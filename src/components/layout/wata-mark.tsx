import { cn } from "@/lib/utils/cn";

export type WataMarkProps = {
  className?: string;
};

/**
 * Marca tipografica da WATA.
 *
 * Texto em vez de imagem: mantem o contraste em qualquer tamanho e evita um
 * asset binario antes de existir logo definitiva. A loja pode enviar um logo
 * proprio em Configuracoes (Fase 3).
 */
export function WataMark({ className }: WataMarkProps) {
  return (
    <span
      className={cn(
        "text-lg font-semibold tracking-[0.28em] text-graphite",
        className,
      )}
    >
      WATA
    </span>
  );
}
