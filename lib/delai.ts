/**
 * Mise en forme d'un délai d'attente en français, pour les messages de quota (429).
 * Fichier sans dépendance : utilisé par le serveur et par le navigateur.
 */

/** « 1 minute », « 12 minutes », « 1 heure », « 2 heures 5 minutes ». Arrondi à la minute supérieure. */
export function formaterDelai(secondes: number): string {
  const minutes = Math.max(1, Math.ceil(secondes / 60));
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  const h = `${heures} heure${heures > 1 ? "s" : ""}`;
  return reste === 0 ? h : `${h} ${reste} minute${reste > 1 ? "s" : ""}`;
}
