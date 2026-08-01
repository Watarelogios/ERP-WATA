import { expect, test } from "@playwright/test";

/**
 * Cenarios criticos da Fase 1 (Secao 19.1).
 *
 * Estes testes cobrem apenas o que nao depende de um usuario cadastrado. O
 * login com credencial real entra na suite quando o seed da Fase 2 existir.
 */

const PROTECTED_ROUTES = [
  "/dashboard",
  "/estoque",
  "/compras",
  "/reservas",
  "/vendas",
  "/financeiro",
  "/clientes",
  "/fornecedores",
  "/configuracoes",
];

test.describe("protecao de rotas", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`usuario nao autenticado nao acessa ${route}`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: "Entrar" }),
      ).toBeVisible();
    });
  }

  test("preserva o destino original apos o redirecionamento", async ({
    page,
  }) => {
    await page.goto("/estoque");

    await expect(page).toHaveURL(/redirectTo=%2Festoque/);
  });

  test("a raiz encaminha para o login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("tela de login", () => {
  test("nao expoe dado comercial antes da autenticacao", async ({ page }) => {
    await page.goto("/login");

    const body = await page.locator("body").innerText();

    for (const term of ["WATA-0", "Capital investido", "Lucro"]) {
      expect(body).not.toContain(term);
    }
  });

  test("valida os campos antes de chamar o servidor", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Informe o e-mail.")).toBeVisible();
    await expect(page.getByText("Informe a senha.")).toBeVisible();
  });

  test("oferece recuperacao de senha", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Esqueci minha senha" }).click();

    await expect(page).toHaveURL(/\/esqueci-senha/);
    await expect(
      page.getByRole("heading", { name: "Recuperar senha" }),
    ).toBeVisible();
  });
});
