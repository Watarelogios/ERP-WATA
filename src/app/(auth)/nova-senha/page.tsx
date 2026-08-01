import type { Metadata } from "next";
import Link from "next/link";

import { NewPasswordForm } from "@/app/(auth)/nova-senha/new-password-form";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Definir nova senha",
};

export default async function NewPasswordPage() {
  /*
   * O link do e-mail passa por /auth/confirm, que cria a sessao de recuperacao.
   * Sem sessao nao ha o que redefinir — o usuario precisa pedir outro link.
   */
  const user = await getCurrentUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>
          Escolha uma senha que voce ainda nao usa em outros servicos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {user ? (
          <NewPasswordForm />
        ) : (
          <>
            <Alert tone="warning" title="Link expirado">
              Este link de redefinicao nao e mais valido.
            </Alert>
            <p className="text-sm text-muted">
              <Link
                href="/esqueci-senha"
                className="text-info underline-offset-4 hover:underline"
              >
                Solicitar um novo link
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
