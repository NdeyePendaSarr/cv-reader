/**
 * POST /api/compare : compare une fiche validée aux critères d'une offre.
 *
 * Corps JSON { fiche, criteres } validé par Zod (fiche conforme à FicheCVSchema, 1 à 20 critères
 * de 200 caractères au plus). Puis : quota de la route compare → modèle → contrôle anti-invention
 * des justifications → journal → 200 { resultats }. Aucun score, aucun total.
 */
import { ipAddress } from "@vercel/functions";
import { ErreurExtraction } from "@/lib/claude";
import { comparer } from "@/lib/compare";
import { formaterDelai } from "@/lib/delai";
import { lireVariable } from "@/lib/env";
import { reponseErreur } from "@/lib/erreurs";
import { journaliser } from "@/lib/log";
import { secondesAvant, verifierQuota } from "@/lib/ratelimit";
import { RequeteComparaisonSchema, type ReponseComparaison } from "@/lib/schemas";

export const maxDuration = 120;

const MESSAGE_ERREUR_INTERNE = "Une erreur inattendue est survenue sur le serveur. Réessayez plus tard.";

export async function POST(request: Request): Promise<Response> {
  try {
    return await traiter(request);
  } catch (erreur) {
    // Nom de l'erreur seulement, jamais son message : il pourrait contenir une valeur du CV ou de la fiche.
    console.error(erreur instanceof Error ? erreur.name : "Erreur inconnue");
    return reponseErreur(500, "ERREUR_INTERNE", MESSAGE_ERREUR_INTERNE);
  }
}

async function traiter(request: Request): Promise<Response> {
  // 1. Corps de la requête : JSON conforme au schéma. Une requête invalide ne consomme pas de quota.
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return reponseErreur(400, "ENTREE_INVALIDE", "Le corps de la requête doit être un JSON { fiche, criteres }.");
  }
  const requete = RequeteComparaisonSchema.safeParse(corps);
  if (!requete.success) {
    const surCriteres = requete.error.issues.some((i) => i.path[0] === "criteres");
    return reponseErreur(
      400,
      "ENTREE_INVALIDE",
      surCriteres
        ? "Indiquez de 1 à 20 critères, de 200 caractères au plus chacun."
        : "La fiche envoyée n'est pas valide. Validez-la de nouveau avant de lancer la comparaison.",
    );
  }
  const { fiche, criteres } = requete.data;

  // 2. Quota de la route compare (indépendant de celui de l'extraction), puis plafond commun.
  const verdict = await verifierQuota("compare", ipAddress(request) ?? "inconnue");
  if (!verdict.ok) {
    const attente = secondesAvant(verdict.reset);
    const message =
      verdict.code === "QUOTA_IP"
        ? `Vous avez atteint la limite de comparaisons (5 par heure, 15 par jour). Réessayez dans ${formaterDelai(attente)}.`
        : `La démo a atteint son nombre d'analyses pour aujourd'hui. Réessayez dans ${formaterDelai(attente)}.`;
    return reponseErreur(429, verdict.code, message, { "Retry-After": String(attente) });
  }

  // 3. Modèle (un seul nouvel essai), puis contrôle anti-invention des justifications.
  const modele = lireVariable("CLAUDE_MODEL");
  let resultat;
  try {
    resultat = await comparer(fiche, criteres, modele);
  } catch (erreur) {
    if (!(erreur instanceof ErreurExtraction)) throw erreur;
    journaliser({
      evenement: "comparaison",
      statut: erreur.code === "MODELE_INDISPONIBLE" ? "modele_indisponible" : "comparaison_impossible",
      ...erreur.mesures,
      criteres: criteres.length,
    });
    return erreur.code === "COMPARAISON_IMPOSSIBLE"
      ? reponseErreur(422, erreur.code, erreur.message)
      : reponseErreur(502, erreur.code, erreur.message);
  }

  // 4. Journal : mesures et compteurs seulement, ni la fiche ni les critères.
  journaliser({
    evenement: "comparaison",
    statut: "ok",
    ...resultat.mesures,
    criteres: criteres.length,
    justificationsRejetees: resultat.justificationsRejetees,
  });

  const reponse: ReponseComparaison = { resultats: resultat.resultats };
  return Response.json(reponse);
}
