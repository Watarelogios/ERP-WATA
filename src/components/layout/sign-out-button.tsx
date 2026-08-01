"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signOutAction } from "@/lib/actions/auth";

/**
 * Botao de sair.
 *
 * O `<form>` recebe a Server Action diretamente (em vez de um wrapper no
 * cliente) para que o envio continue funcionando antes da hidratacao.
 * `useFormStatus` precisa ficar em um componente filho do form.
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      disabled={pending}
      // 44px no celular, mais compacto a partir de sm.
      className="h-11 sm:h-9"
    >
      {pending ? (
        <Spinner label="Saindo" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{pending ? "Saindo..." : "Sair"}</span>
      <span className="sr-only sm:hidden">Sair</span>
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  );
}
