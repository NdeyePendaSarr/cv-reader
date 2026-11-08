/**
 * Quotas d'appels au modèle (docs/SPEC.md, « Limitation de débit »).
 *
 * Par IP et par route : 5 par heure et 15 par jour. Plafond commun : 100 appels au modèle par jour.
 * Les compteurs vivent dans Upstash Redis et expirent seuls ; l'adresse IP n'y entre jamais
 * en clair, seulement son empreinte HMAC-SHA256.
 */
import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { lireVariable } from "@/lib/env";

export type Route = "extract" | "compare";
export type Verdict =
  | { ok: true }
  | { ok: false; code: "QUOTA_IP" | "PLAFOND_GLOBAL"; reset: number };

/** Ce que l'on attend d'une limite : la forme utile de `Ratelimit` (simulable dans les tests). */
export interface Limite {
  limit(identifiant: string): Promise<{ success: boolean; reset: number }>;
}

export interface Limites {
  extract: { heure: Limite; jour: Limite };
  compare: { heure: Limite; jour: Limite };
  plafond: Limite;
}

function creerLimites(): Limites {
  // Noms créés par l'intégration Upstash de Vercel (Redis.fromEnv() attend d'autres noms).
  const redis = new Redis({
    url: lireVariable("KV_REST_API_URL"),
    token: lireVariable("KV_REST_API_TOKEN"),
  });
  const parRoute = (route: Route) => ({
    heure: new Ratelimit({ redis, prefix: `${route}-h`, limiter: Ratelimit.slidingWindow(5, "1 h") }),
    jour: new Ratelimit({ redis, prefix: `${route}-j`, limiter: Ratelimit.slidingWindow(15, "24 h") }),
  });
  return {
    extract: parRoute("extract"),
    compare: parRoute("compare"),
    plafond: new Ratelimit({ redis, prefix: "global", limiter: Ratelimit.fixedWindow(100, "24 h") }),
  };
}

let limites: Limites | null = null;

/** Lu à l'appel, pas à l'import : la compilation et les tests ne cassent pas. */
function secretHmac(): string {
  return lireVariable("IP_HASH_SECRET"); // erreur explicite si absent, jamais en silence
}

/** Empreinte HMAC-SHA256 : impossible à inverser sans le secret. */
export function empreinteIp(ip: string): string {
  return createHmac("sha256", secretHmac()).update(ip).digest("hex");
}

/**
 * Vérifie les quotas de la route pour cette IP, puis le plafond commun.
 * Les quotas par IP passent d'abord : un visiteur bloqué ne consomme pas d'appel du jour.
 * `limitesInjectees` sert aux tests ; en production, les limites Upstash sont créées au premier appel.
 */
export async function verifierQuota(
  route: Route,
  ip: string,
  limitesInjectees?: Limites,
): Promise<Verdict> {
  const l = limitesInjectees ?? (limites ??= creerLimites());
  const id = empreinteIp(ip);
  for (const limite of [l[route].heure, l[route].jour]) {
    const r = await limite.limit(id);
    if (!r.success) return { ok: false, code: "QUOTA_IP", reset: r.reset };
  }
  const g = await l.plafond.limit("tous");
  return g.success ? { ok: true } : { ok: false, code: "PLAFOND_GLOBAL", reset: g.reset };
}

/** Délai d'attente en secondes avant `reset` (horodatage en millisecondes), au moins 1. */
export function secondesAvant(reset: number, maintenant: number = Date.now()): number {
  return Math.max(1, Math.ceil((reset - maintenant) / 1000));
}
