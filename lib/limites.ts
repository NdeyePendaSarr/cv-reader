/**
 * Limites partagées par le navigateur et le serveur.
 * Fichier sans dépendance, pour ne pas embarquer unpdf dans le code du navigateur.
 */

/** Taille maximale acceptée : 4 Mo (Vercel refuse tout corps au-delà de 4,5 Mo). */
export const TAILLE_MAX_OCTETS = 4 * 1024 * 1024;

/** Nombre maximal de pages accepté. */
export const PAGES_MAX = 5;

/**
 * POST /api/compare : taille maximale de la fiche, en octets de son JSON (UTF-8) : 64 Ko.
 * Une fiche de CV fictif en fait 2 ; une extraction est plafonnée à 16 000 jetons de sortie (environ 60 Ko).
 */
export const FICHE_MAX_OCTETS = 64 * 1024;

/** POST /api/compare : taille maximale des critères de l'offre (JSON UTF-8) : 16 Ko, soit plus que 20 critères de 200 caractères accentués. */
export const OFFRE_MAX_OCTETS = 16 * 1024;

/** POST /api/compare : taille maximale du corps entier, contrôlée avant de lire le JSON : 96 Ko. */
export const CORPS_COMPARE_MAX_OCTETS = 96 * 1024;
