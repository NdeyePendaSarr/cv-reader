/**
 * En-têtes de sécurité HTTP (next.config.ts, lib/entetes.ts) : présents sur toutes les routes,
 * avec une politique de sécurité du contenu (CSP) aussi stricte que le permet une page pré-rendue.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cspPour, ENTETES_SECURITE } from "@/lib/entetes";
import nextConfig from "@/next.config";

/** Directives d'une CSP, sous la forme { "script-src": ["'self'", …] }. */
function directives(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [nom, ...valeurs] = d.split(/\s+/);
        return [nom!, valeurs];
      }),
  );
}

afterEach(() => vi.unstubAllEnvs());

describe("en-têtes de sécurité", () => {
  it("s'appliquent à toutes les routes, pages comme API", async () => {
    const regles = await nextConfig.headers!();
    expect(regles).toHaveLength(1);
    expect(regles[0]!.source).toBe("/:chemin*");
    const noms = regles[0]!.headers.map((h) => h.key);
    for (const nom of [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(noms).toContain(nom);
    }
  });

  it("interdisent l'intégration dans un cadre, le reniflage de type et l'envoi du référent", () => {
    const valeur = (nom: string) => ENTETES_SECURITE.find((h) => h.key === nom)?.value;
    expect(valeur("X-Frame-Options")).toBe("DENY");
    expect(valeur("X-Content-Type-Options")).toBe("nosniff");
    expect(valeur("Referrer-Policy")).toBe("no-referrer");
    const permissions = valeur("Permissions-Policy")!;
    for (const fonction of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      expect(permissions).toContain(`${fonction}=()`);
    }
  });

  it("CSP de production : tout depuis le site seulement, aucun cadre, aucun plugin, aucun eval", () => {
    const d = directives(cspPour("production"));
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'none'"]);
    expect(d["form-action"]).toEqual(["'none'"]);
    expect(d["connect-src"]).toEqual(["'self'"]);
    expect(d["style-src"]).toEqual(["'self'"]);
    // 'unsafe-inline' reste nécessaire pour les scripts en ligne de Next.js (page pré-rendue, sans nonce).
    expect(d["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(cspPour("production")).not.toContain("unsafe-eval");
    expect(cspPour("production")).not.toMatch(/https?:|\*/);
  });

  it("CSP de développement : ajoute seulement eval, les styles en ligne et la connexion du rechargement à chaud", () => {
    const d = directives(cspPour("development"));
    expect(d["script-src"]).toEqual(["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
    expect(d["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d["connect-src"]).toEqual(["'self'", "ws:"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("next.config.ts sert la CSP de production hors du mode développement", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const regles = await nextConfig.headers!();
    const csp = regles[0]!.headers.find((h) => h.key === "Content-Security-Policy")!.value;
    expect(csp).toBe(cspPour("production"));
  });
});
