/**
 * Lecture des variables d'environnement côté serveur.
 *
 * La lecture a lieu au moment de l'appel, jamais à l'import : la compilation
 * (`next build`) et les tests ne cassent donc pas quand un secret est absent.
 */

/** Noms des variables attendues, tels que listés dans `.env.example`. */
export type NomVariable =
  | "ANTHROPIC_API_KEY"
  | "IP_HASH_SECRET"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "CLAUDE_MODEL";

/**
 * Renvoie la valeur de la variable `nom`.
 * Lève une erreur explicite si elle est absente ou vide : jamais d'échec silencieux.
 * Le message cite le nom de la variable, jamais une valeur.
 */
export function lireVariable(nom: NomVariable): string {
  const valeur = process.env[nom];
  if (valeur === undefined || valeur.trim() === "") {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. Ajoutez-la dans les réglages du projet Vercel (ou dans .env.local en local).`,
    );
  }
  return valeur;
}
