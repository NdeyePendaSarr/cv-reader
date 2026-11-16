import type { NextConfig } from "next";
import { enTetesSecurite } from "./lib/entetes";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // En-têtes de sécurité sur toutes les routes, pages comme API (lib/entetes.ts).
  async headers() {
    return [{ source: "/:chemin*", headers: enTetesSecurite() }];
  },
};

export default nextConfig;
