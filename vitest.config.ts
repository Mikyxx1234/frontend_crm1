import { defineConfig } from "vitest/config";

// Config mínima: testes unitários de helpers puros (node env). Os helpers de
// herança em features/messaging-roles não dependem de DOM nem de alias.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
