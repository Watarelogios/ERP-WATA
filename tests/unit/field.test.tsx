import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("liga label, descricao e erro ao input", () => {
    const description = "Enviaremos um link para este endereco.";
    const error = "Informe um e-mail valido.";

    render(
      <Field
        id="email"
        label="E-mail"
        description={description}
        error={error}
        required
      >
        <Input
          name="email"
          {...fieldAria("email", { description, error })}
        />
      </Field>,
    );

    const input = screen.getByLabelText(/E-mail/);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(`${description} ${error}`);
  });

  it("anuncia a mensagem de erro", () => {
    render(
      <Field id="senha" label="Senha" error="Informe a senha.">
        <Input name="senha" {...fieldAria("senha", { error: "Informe a senha." })} />
      </Field>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Informe a senha.");
  });

  it("nao marca aria-invalid quando nao ha erro", () => {
    render(
      <Field id="cidade" label="Cidade">
        <Input name="cidade" {...fieldAria("cidade", {})} />
      </Field>,
    );

    const input = screen.getByLabelText("Cidade");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});
