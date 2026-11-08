import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests de la logique de lib/ (environnement Node) et des composants (fichiers .test.tsx,
// qui demandent l'environnement jsdom par un commentaire en tête de fichier).
export default defineConfig({
  resolve: {
    // Même alias que tsconfig.json : « @/ » désigne la racine du projet.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
