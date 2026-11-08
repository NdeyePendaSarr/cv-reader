/**
 * POST /api/extract : reçoit un CV en PDF (multipart/form-data, champ « file »).
 *
 * Tranche T1 : seuls les contrôles du fichier sont en place. Un fichier valide
 * reçoit 501 EXTRACTION_PAS_ENCORE_DISPONIBLE ; l'appel au modèle arrive en T2.
 * Le PDF reste en mémoire : il n'est écrit nulle part.
 */
import { reponseErreur } from "@/lib/erreurs";
import { verifierPdf } from "@/lib/pdf";

export async function POST(request: Request): Promise<Response> {
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
  const verdict = await verifierPdf(octets);
  if (!verdict.ok) {
    return reponseErreur(verdict.statut, verdict.code, verdict.message);
  }

  const pluriel = verdict.pages > 1 ? "s" : "";
  return reponseErreur(
    501,
    "EXTRACTION_PAS_ENCORE_DISPONIBLE",
    `PDF valide (${verdict.pages} page${pluriel}). L'extraction des informations arrive bientôt.`,
  );
}
