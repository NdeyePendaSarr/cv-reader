import { afterEach, describe, expect, it, vi } from "vitest";

// On remet l'environnement d'origine après chaque test.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("lireVariable", () => {
  it("renvoie la valeur quand la variable est présente", async () => {
    vi.stubEnv("CLAUDE_MODEL", "modele-de-test");
    const { lireVariable } = await import("@/lib/env");
    expect(lireVariable("CLAUDE_MODEL")).toBe("modele-de-test");
  });

  it("lève une erreur claire, qui nomme la variable, quand elle est absente", async () => {
    vi.stubEnv("IP_HASH_SECRET", undefined);
    const { lireVariable } = await import("@/lib/env");
    expect(() => lireVariable("IP_HASH_SECRET")).toThrow(
      "Variable d'environnement manquante : IP_HASH_SECRET",
    );
  });

  it("traite une valeur vide comme absente", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "   ");
    const { lireVariable } = await import("@/lib/env");
    expect(() => lireVariable("ANTHROPIC_API_KEY")).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("lit la variable à l'appel, pas à l'import", async () => {
    vi.stubEnv("CLAUDE_MODEL", undefined);
    const { lireVariable } = await import("@/lib/env");
    // Variable définie après l'import : elle doit quand même être vue.
    vi.stubEnv("CLAUDE_MODEL", "defini-apres-import");
    expect(lireVariable("CLAUDE_MODEL")).toBe("defini-apres-import");
  });

  it("l'import seul ne lève rien, même sans aucune variable", async () => {
    for (const nom of [
      "ANTHROPIC_API_KEY",
      "IP_HASH_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "CLAUDE_MODEL",
    ]) {
      vi.stubEnv(nom, undefined);
    }
    await expect(import("@/lib/env")).resolves.toHaveProperty("lireVariable");
  });
});
