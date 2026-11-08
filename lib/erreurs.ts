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
  // T1 seulement : le fichier est valide, mais l'extraction arrive en T2.
  | "EXTRACTION_PAS_ENCORE_DISPONIBLE";

export interface ReponseErreur {
  code: CodeErreur;
  message: string;
}

/** Construit une réponse HTTP d'erreur au format `{ code, message }`. */
export function reponseErreur(statut: number, code: CodeErreur, message: string): Response {
  const corps: ReponseErreur = { code, message };
  return Response.json(corps, { status: statut });
}
