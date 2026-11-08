/**
 * Limites partagées par le navigateur et le serveur.
 * Fichier sans dépendance, pour ne pas embarquer unpdf dans le code du navigateur.
 */

/** Taille maximale acceptée : 4 Mo (Vercel refuse tout corps au-delà de 4,5 Mo). */
export const TAILLE_MAX_OCTETS = 4 * 1024 * 1024;

/** Nombre maximal de pages accepté. */
export const PAGES_MAX = 5;
