import { describe, expect, it } from "vitest";
import * as z from "zod";

import {
  forgotPasswordSchema,
  loginSchema,
  MIN_PASSWORD_LENGTH,
  newPasswordSchema,
} from "@/lib/validations/auth";

function fieldErrors<T>(error: z.core.$ZodError<T>) {
  return z.flattenError(error).fieldErrors;
}

describe("loginSchema", () => {
  it("aceita credenciais bem formadas e normaliza o e-mail", () => {
    const result = loginSchema.safeParse({
      email: "  admin@wata.com  ",
      password: "senha-secreta",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("admin@wata.com");
  });

  it("exige e-mail valido", () => {
    const result = loginSchema.safeParse({
      email: "admin",
      password: "senha-secreta",
    });

    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).email).toBeDefined();
  });

  it("exige senha preenchida", () => {
    const result = loginSchema.safeParse({
      email: "admin@wata.com",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).password).toBeDefined();
  });
});

describe("forgotPasswordSchema", () => {
  it("recusa e-mail vazio", () => {
    const result = forgotPasswordSchema.safeParse({ email: "   " });

    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).email).toBeDefined();
  });
});

describe("newPasswordSchema", () => {
  it("exige comprimento minimo", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = newPasswordSchema.safeParse({
      password: short,
      confirmPassword: short,
    });

    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).password).toBeDefined();
  });

  it("reporta divergencia no campo de confirmacao", () => {
    const result = newPasswordSchema.safeParse({
      password: "senha-forte-1",
      confirmPassword: "senha-forte-2",
    });

    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).confirmPassword).toEqual([
      "As senhas nao conferem.",
    ]);
  });

  it("aceita senhas iguais e suficientemente longas", () => {
    const result = newPasswordSchema.safeParse({
      password: "senha-forte-1",
      confirmPassword: "senha-forte-1",
    });

    expect(result.success).toBe(true);
  });
});
