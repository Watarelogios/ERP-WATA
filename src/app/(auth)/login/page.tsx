import type { Metadata } from "next";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

export const metadata: Metadata = {
  title: "Entrar",
};

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; erro?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // searchParams e assincrono a partir do Next.js 16.
  const params = await searchParams;
  const redirectTo = params.redirectTo
    ? safeRedirectPath(params.redirectTo)
    : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Use o e-mail e a senha da administracao da WATA.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasSupabaseEnv() ? (
          <Alert tone="warning" title="Configuracao pendente">
            Defina NEXT_PUBLIC_SUPABASE_URL e
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em <code>.env.local</code> para
            habilitar o login.
          </Alert>
        ) : null}

        {params.erro === "link-invalido" ? (
          <Alert tone="danger" title="Link invalido ou expirado">
            Solicite um novo e-mail de acesso e tente novamente.
          </Alert>
        ) : null}

        <LoginForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
