"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signInAction, type LoginFormState } from "@/lib/actions/auth";

const INITIAL_STATE: LoginFormState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL_STATE);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailError = state.errors?.email?.[0];
  const passwordError = state.errors?.password?.[0];

  // Foco no primeiro campo com erro, para nao obrigar o usuario a procurar.
  useEffect(() => {
    if (emailError) {
      emailRef.current?.focus();
    } else if (passwordError) {
      passwordRef.current?.focus();
    }
  }, [emailError, passwordError]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field id="email" label="E-mail" error={emailError} required>
        <Input
          ref={emailRef}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          {...fieldAria("email", { error: emailError })}
        />
      </Field>

      <Field id="password" label="Senha" error={passwordError} required>
        <Input
          ref={passwordRef}
          type="password"
          name="password"
          autoComplete="current-password"
          {...fieldAria("password", { error: passwordError })}
        />
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner label="Entrando" /> : null}
        {pending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm">
        <Link
          href="/esqueci-senha"
          className="text-info underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
