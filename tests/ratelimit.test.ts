/**
 * lib/ratelimit.ts avec des limites simulées en mémoire : aucun appel à Redis.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Limite, Limites } from "@/lib/ratelimit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Fenêtre simulée : `max` passages par identifiant, puis refus. */
class FausseLimite implements Limite {
  readonly compteurs = new Map<string, number>();
  constructor(private readonly max: number) {}
  async limit(id: string) {
    const n = (this.compteurs.get(id) ?? 0) + 1;
    this.compteurs.set(id, n);
    return { success: n <= this.max, reset: Date.now() + 3_600_000 };
  }
}

function limitesSimulees(plafond = 100): Limites {
  return {
    extract: { heure: new FausseLimite(5), jour: new FausseLimite(15) },
    compare: { heure: new FausseLimite(5), jour: new FausseLimite(15) },
    plafond: new FausseLimite(plafond),
  };
}

describe("empreinteIp", () => {
  it("donne la même empreinte pour la même IP, différente de l'IP en clair", async () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-de-test");
    const { empreinteIp } = await import("@/lib/ratelimit");
    const a = empreinteIp("203.0.113.7");
    expect(a).toBe(empreinteIp("203.0.113.7"));
    expect(a).not.toContain("203.0.113.7");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteIp("203.0.113.8")).not.toBe(a);
  });

  it("sans IP_HASH_SECRET : l'import réussit, l'appel échoue avec une erreur explicite", async () => {
    vi.stubEnv("IP_HASH_SECRET", undefined);
    const ratelimit = await import("@/lib/ratelimit");
    expect(() => ratelimit.empreinteIp("203.0.113.7")).toThrow(/IP_HASH_SECRET/);
  });
});

describe("verifierQuota", () => {
  it("6e extraction dans l'heure → QUOTA_IP ; les comparaisons restent possibles", async () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-de-test");
    const { verifierQuota } = await import("@/lib/ratelimit");
    const limites = limitesSimulees();
    for (let i = 0; i < 5; i++) {
      expect(await verifierQuota("extract", "203.0.113.7", limites)).toEqual({ ok: true });
    }
    const sixieme = await verifierQuota("extract", "203.0.113.7", limites);
    expect(sixieme).toMatchObject({ ok: false, code: "QUOTA_IP" });
    expect(await verifierQuota("compare", "203.0.113.7", limites)).toEqual({ ok: true });
    // Une autre IP n'est pas touchée.
    expect(await verifierQuota("extract", "198.51.100.1", limites)).toEqual({ ok: true });
  });

  it("un visiteur bloqué ne consomme pas d'appel du plafond commun", async () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-de-test");
    const { verifierQuota } = await import("@/lib/ratelimit");
    const limites = limitesSimulees();
    for (let i = 0; i < 8; i++) await verifierQuota("extract", "203.0.113.7", limites);
    expect((limites.plafond as FausseLimite).compteurs.get("tous")).toBe(5);
  });

  it("plafond commun atteint → PLAFOND_GLOBAL", async () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-de-test");
    const { verifierQuota } = await import("@/lib/ratelimit");
    const limites = limitesSimulees(2);
    await verifierQuota("extract", "198.51.100.1", limites);
    await verifierQuota("extract", "198.51.100.2", limites);
    expect(await verifierQuota("extract", "198.51.100.3", limites)).toMatchObject({ ok: false, code: "PLAFOND_GLOBAL" });
  });

  it("n'enregistre jamais l'IP en clair dans les compteurs", async () => {
    vi.stubEnv("IP_HASH_SECRET", "secret-de-test");
    const { verifierQuota } = await import("@/lib/ratelimit");
    const limites = limitesSimulees();
    await verifierQuota("extract", "203.0.113.7", limites);
    const ids = [...(limites.extract.heure as FausseLimite).compteurs.keys()];
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toContain("203.0.113.7");
  });
});

describe("secondesAvant", () => {
  it("arrondit à la seconde supérieure, au moins 1", async () => {
    const { secondesAvant } = await import("@/lib/ratelimit");
    expect(secondesAvant(10_500, 0)).toBe(11);
    expect(secondesAvant(0, 5_000)).toBe(1);
  });
});
