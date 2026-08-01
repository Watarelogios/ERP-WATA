import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resolve o alias "@/*" declarado no tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/db/**/*.test.ts"],
    // Subir um Postgres em WASM por arquivo leva mais que o padrao de 5s.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Os fluxos e2e ficam no Playwright; o Vitest nao deve tentar executa-los.
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
