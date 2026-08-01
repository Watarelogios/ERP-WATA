"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

export type SearchInputProps = {
  /** Nome do parametro na URL. */
  param?: string;
  placeholder?: string;
  label: string;
  className?: string;
};

/** Espera o usuario parar de digitar antes de refazer a consulta. */
const DEBOUNCE_MS = 350;

/**
 * Busca refletida na URL.
 *
 * Manter o termo na query string faz a consulta acontecer no servidor, permite
 * compartilhar o link e preserva o resultado ao voltar pelo navegador.
 */
export function SearchInput({
  param = "q",
  placeholder = "Buscar...",
  label,
  className,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get(param) ?? "");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa o timer pendente ao desmontar, senao a navegacao dispara depois.
  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.trim()) {
      params.set(param, next.trim());
    } else {
      params.delete(param);
    }

    // Uma busca nova sempre volta para a primeira pagina.
    params.delete("pagina");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onChange(next: string) {
    setValue(next);

    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    timeout.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted"
        aria-hidden="true"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-md border border-border bg-white pl-9 pr-9 text-sm text-graphite-dark placeholder:text-muted"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (timeout.current) {
              clearTimeout(timeout.current);
            }
            push("");
          }}
          className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded text-muted hover:text-graphite"
          aria-label="Limpar busca"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
