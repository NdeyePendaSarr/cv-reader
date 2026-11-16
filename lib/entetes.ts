/**
 * En-têtes de sécurité HTTP, appliqués à toutes les routes par next.config.ts.
 *
 * Politique de sécurité du contenu (CSP) : tout vient du site lui-même ; aucun cadre, aucun
 * plugin, aucune balise <base>, aucun envoi de formulaire natif (les formulaires sont traités
 * en JavaScript), aucun style en ligne.
 *
 * Seule concession : script-src 'unsafe-inline'. La page d'accueil est pré-rendue à la
 * compilation, et Next.js y écrit des scripts en ligne (amorce de Turbopack, données de rendu
 * `self.__next_f.push`). Les autoriser autrement demanderait un nonce tiré à chaque requête,
 * donc une page rendue à chaque visite au lieu d'être servie depuis le cache du CDN.
 * Le risque reste borné : React échappe tout texte affiché (aucun dangerouslySetInnerHTML),
 * et aucun script d'un autre site ne peut être chargé.
 */

type Mode = "production" | "development";

/**
 * CSP du mode donné. Le développement (next dev) ajoute eval (outils de React), les styles en ligne
 * et le WebSocket du rechargement à chaud.
 */
export function cspPour(mode: Mode): string {
  const dev = mode === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    // next dev injecte ses styles en ligne (rechargement à chaud, outils de développement) ; pas la production.
    `style-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** En-têtes communs à tous les modes ; la CSP est ajoutée par enTetesSecurite. */
export const ENTETES_SECURITE: readonly { key: string; value: string }[] = [
  // Doublon volontaire de frame-ancestors, pour les navigateurs qui ne lisent pas la CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Aucune page n'a besoin d'envoyer son adresse aux sites liés (GitHub, documentation).
  { key: "Referrer-Policy", value: "no-referrer" },
  // Aucune fonction sensible du navigateur n'est utilisée.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

/** Tous les en-têtes, CSP comprise, selon NODE_ENV (lu à l'appel : « development » sous next dev). */
export function enTetesSecurite(): { key: string; value: string }[] {
  const mode: Mode = process.env.NODE_ENV === "development" ? "development" : "production";
  return [{ key: "Content-Security-Policy", value: cspPour(mode) }, ...ENTETES_SECURITE];
}
