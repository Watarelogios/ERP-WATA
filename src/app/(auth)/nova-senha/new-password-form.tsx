"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  updatePasswordAction,
  type NewPasswordFormState,
} from "@/lib/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/validations/auth";

const INITIAL_STATE: NewPasswordFormState = {};

const PASSWORD_DESCRIPTION = `Minimo de ${MIN_PASSWORD_LENGTH} caracteres.`;

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    INITIAL_STATE,
  );

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const passwordError = state.errors?.password?.[0];
  const confirmError = state.errors?.confirmPassword?.[0];

  useEffect(() => {
    if (passwordError) {
      passwordRef.current?.focus();
    } else if (confirmError) {
      confirmRef.current?.focus();
    }
  }, [passwordError, confirmError]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field
        id="password"
        label="Nova senha"
        error={passwordError}
        description={PASSWORD_DESCRIPTION}
        required
      >
        <Input
          ref={passwordRef}
          type="password"
          name="password"
          autoComplete="new-password"
          autoFocus
          {...fieldAria("password", {
            error: passwordError,
            description: PASSWORD_DESCRIPTION,
          })}
        />
      </Field>

      <Field
        id="confirmPassword"
        label="Repetir nova senha"
        error={confirmError}
        required
      >
        <Input
          ref={confirmRef}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          {...fieldAria("confirmPassword", { error: confirmError })}
        />
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner label="Salvando" /> : null}
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
