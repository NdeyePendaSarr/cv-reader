/**
 * Format commun des erreurs renvoyées par les routes API : `{ code, message }`,
 * avec un message en français lisible par l'utilisatrice (docs/SPEC.md, « Routes API »).
 */

/** Codes d'erreur de la spec, plus le code provisoire de la tranche T1. */
export type CodeErreur =
  | "FICHIER_INVALIDE"
  | "TROP_DE_PAGES"
  | "ENTREE_INVALIDE"
  | "FICHIER_TROP_LOURD"
  | "EXTRACTION_IMPOSSIBLE"
  | "QUOTA_IP"
  | "PLAFOND_GLOBAL"
  | "MODELE_INDISPONIBLE"
  // Erreur inattendue côté serveur (configuration incomplète, panne interne) : 500.
  | "ERREUR_INTERNE";

export interface ReponseErreur {
  code: CodeErreur;
  message: string;
}

/** Construit une réponse HTTP d'erreur au format `{ code, message }`, avec d'éventuels en-têtes. */
export function reponseErreur(
  statut: number,
  code: CodeErreur,
  message: string,
  entetes?: Record<string, string>,
): Response {
  const corps: ReponseErreur = { code, message };
  return Response.json(corps, { status: statut, headers: entetes });
}
