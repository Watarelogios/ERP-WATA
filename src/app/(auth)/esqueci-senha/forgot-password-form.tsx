"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  requestPasswordResetAction,
  type ForgotPasswordFormState,
} from "@/lib/actions/auth";

const INITIAL_STATE: ForgotPasswordFormState = {};

const EMAIL_DESCRIPTION =
  "Enviaremos um link para voce definir uma nova senha.";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );

  const emailRef = useRef<HTMLInputElement>(null);
  const emailError = state.errors?.email?.[0];

  useEffect(() => {
    if (emailError) {
      emailRef.current?.focus();
    }
  }, [emailError]);

  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="E-mail enviado">
          {state.message}
        </Alert>

        <Link
          href="/login"
          className={buttonVariants({
            variant: "secondary",
            size: "lg",
            block: true,
          })}
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field
        id="email"
        label="E-mail"
        error={emailError}
        description={EMAIL_DESCRIPTION}
        required
      >
        <Input
          ref={emailRef}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          {...fieldAria("email", {
            error: emailError,
            description: EMAIL_DESCRIPTION,
          })}
        />
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner label="Enviando" /> : null}
        {pending ? "Enviando..." : "Enviar link de redefinicao"}
      </Button>

      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-info underline-offset-4 hover:underline"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
