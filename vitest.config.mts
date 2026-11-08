import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests unitaires de la logique de lib/, sans serveur ni navigateur.
export default defineConfig({
  resolve: {
    // Même alias que tsconfig.json : « @/ » désigne la racine du projet.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
