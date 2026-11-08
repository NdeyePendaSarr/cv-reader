/**
 * POST /api/extract : reçoit un CV en PDF (multipart/form-data, champ « file ») et renvoie sa fiche.
 *
 * Ordre des étapes : quota → contrôle du PDF et lecture de son texte → modèle →
 * vérification des valeurs contre le texte → journal → 200 { fiche, aVerifier, modele, dureeMs }.
 * Le PDF reste en mémoire : il n'est écrit nulle part.
 */
import { ipAddress } from "@vercel/functions";
import { ErreurExtraction, extraire } from "@/lib/claude";
import { formaterDelai } from "@/lib/delai";
import { lireVariable } from "@/lib/env";
import { reponseErreur } from "@/lib/erreurs";
import { journaliser } from "@/lib/log";
import { verifierPdf } from "@/lib/pdf";
import { secondesAvant, verifierQuota } from "@/lib/ratelimit";
import { cheminsAVerifier } from "@/lib/verif-texte";

/** Une extraction prend quelques secondes à quelques dizaines de secondes (300 s au plus sur Vercel gratuit). */
export const maxDuration = 120;

/** Message affiché quand une erreur inattendue survient côté serveur. */
const MESSAGE_ERREUR_INTERNE =
  "Une erreur inattendue est survenue sur le serveur. Réessayez plus tard, ou choisissez un CV fictif.";

export async function POST(request: Request): Promise<Response> {
  try {
    return await traiter(request);
  } catch (erreur) {
    // Nom et message de l'erreur seulement (jamais de contenu du CV) ; ex. variable d'environnement manquante.
    console.error(erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : "Erreur inconnue");
    return reponseErreur(500, "ERREUR_INTERNE", MESSAGE_ERREUR_INTERNE);
  }
}

async function traiter(request: Request): Promise<Response> {
  // 1. Quota, avant toute lecture du corps. L'IP vient de Vercel (en-tête x-real-ip) ;
  //    en local, elle est absente et tous les appels partagent le même compteur.
  const verdict = await verifierQuota("extract", ipAddress(request) ?? "inconnue");
  if (!verdict.ok) {
    const attente = secondesAvant(verdict.reset);
    const message =
      verdict.code === "QUOTA_IP"
        ? `Vous avez atteint la limite d'analyses (5 par heure, 15 par jour). Réessayez dans ${formaterDelai(attente)}, ou choisissez un CV fictif.`
        : `La démo a atteint son nombre d'analyses pour aujourd'hui. Réessayez dans ${formaterDelai(attente)}, ou choisissez un CV fictif.`;
    return reponseErreur(429, verdict.code, message, { "Retry-After": String(attente) });
  }

  // 2. Lecture du formulaire et contrôle du PDF (signature, taille, pages), avec son texte.
  let formulaire: FormData;
  try {
    formulaire = await request.formData();
  } catch {
    return reponseErreur(
      400,
      "ENTREE_INVALIDE",
      "La requête doit être un formulaire multipart contenant le champ « file ».",
    );
  }
  const fichier = formulaire.get("file");
  if (!(fichier instanceof File)) {
    return reponseErreur(400, "ENTREE_INVALIDE", "Aucun fichier reçu dans le champ « file ».");
  }
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const pdf = await verifierPdf(octets);
  if (!pdf.ok) return reponseErreur(pdf.statut, pdf.code, pdf.message);

  // 3. Appel au modèle (avec au plus un nouvel essai).
  const modele = lireVariable("CLAUDE_MODEL");
  let resultat;
  try {
    resultat = await extraire(octets, modele);
  } catch (erreur) {
    if (!(erreur instanceof ErreurExtraction)) throw erreur;
    journaliser({
      evenement: "extraction",
      statut: erreur.code === "EXTRACTION_IMPOSSIBLE" ? "extraction_impossible" : "modele_indisponible",
      ...erreur.mesures,
    });
    return erreur.code === "EXTRACTION_IMPOSSIBLE"
      ? reponseErreur(422, erreur.code, erreur.message)
      : reponseErreur(502, erreur.code, erreur.message);
  }

  // 4. Chaque valeur courte est cherchée dans le texte du PDF.
  const aVerifier = cheminsAVerifier(resultat.fiche, pdf.texte);

  // 5. Journal : mesures seulement, aucun contenu du CV.
  const { fiche, ...mesures } = resultat;
  journaliser({ evenement: "extraction", statut: "ok", ...mesures, aVerifier: aVerifier.length });

  return Response.json({ fiche, aVerifier, modele: resultat.modele, dureeMs: resultat.dureeMs });
}
