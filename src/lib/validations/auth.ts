import * as z from "zod";

/** Comprimento minimo aceito pelo Supabase Auth por padrao. */
export const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Informe o e-mail." })
    .pipe(z.email({ error: "Informe um e-mail valido." })),
  password: z.string().min(1, { error: "Informe a senha." }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: "Informe o e-mail." })
    .pipe(z.email({ error: "Informe um e-mail valido." })),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, {
      error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    }),
    confirmPassword: z.string().min(1, { error: "Repita a nova senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas nao conferem.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
