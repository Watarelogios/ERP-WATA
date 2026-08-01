import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/app/(auth)/esqueci-senha/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail cadastrado para receber o link de redefinicao.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
