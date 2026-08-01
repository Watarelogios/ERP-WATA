"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ListEditorProps = {
  /** Nome do campo; cada item vai como um input oculto com este nome. */
  name: string;
  label: string;
  defaultItems?: string[];
  placeholder?: string;
  describedBy?: string;
};

/**
 * Editor de lista curta (canais de venda, categorias).
 *
 * Cada item vira um input oculto com o mesmo nome, entao a Server Action lê a
 * lista com `formData.getAll(name)` — sem JSON no meio do caminho.
 */
export function ListEditor({
  name,
  label,
  defaultItems = [],
  placeholder = "Adicionar item",
  describedBy,
}: ListEditorProps) {
  const [items, setItems] = useState<string[]>(defaultItems);
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();

    if (!value || items.includes(value)) {
      setDraft("");
      return;
    }

    setItems((current) => [...current, value]);
    setDraft("");
  }

  return (
    <div>
      {items.map((item) => (
        <input key={item} type="hidden" name={name} value={item} />
      ))}

      {items.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() =>
                  setItems((current) => current.filter((i) => i !== item))
                }
                className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-white hover:text-danger"
                aria-label={`Remover ${item}`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter adiciona o item sem enviar o formulario inteiro.
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={`${label}: novo item`}
          aria-describedby={describedBy}
          maxLength={60}
        />

        <Button
          variant="secondary"
          size="icon"
          onClick={add}
          disabled={!draft.trim()}
          aria-label={`Adicionar em ${label}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
