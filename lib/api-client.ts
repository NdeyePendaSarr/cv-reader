/**
 * Client navigateur de la route POST /api/extract.
 *
 * Il contrôle le fichier avant l'envoi (type et taille), puis lit la réponse avec
 * prudence : au-delà de 4,5 Mo, Vercel répond lui-même 413 avec une page qui n'est
 * pas du JSON. Quoi qu'il arrive, l'appelant reçoit un message clair en français.
 */
import type { CodeErreur, ReponseErreur } from "@/lib/erreurs";
import { TAILLE_MAX_OCTETS } from "@/lib/limites";
import type { FicheCV } from "@/lib/schemas";

/** Réponse attendue de la route en cas de succès (à partir de T2). */
export interface ReponseExtraction {
  fiche: FicheCV;
  aVerifier: string[];
  modele: string;
  dureeMs: number;
}

/** Codes propres au navigateur, quand la réponse du serveur est inexploitable. */
export type CodeClient = "RESEAU" | "REPONSE_INATTENDUE";

export type ResultatEnvoi =
  | { ok: true; donnees: ReponseExtraction }
  | { ok: false; code: CodeErreur | CodeClient; message: string };

const MESSAGE_TROP_LOURD =
  "Le fichier dépasse 4 Mo. Choisissez un PDF plus léger.";

/** Vrai si le fichier se présente comme un PDF (type MIME ou extension). */
function ressembleAUnPdf(fichier: File): boolean {
  return fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.name);
}

/**
 * Contrôles faits dans le navigateur, avant tout envoi.
 * Le serveur refait les mêmes contrôles : ceux-ci ne servent qu'à répondre vite.
 * Renvoie null si le fichier peut être envoyé, sinon l'erreur à afficher.
 */
export function verifierFichierAvantEnvoi(
  fichier: File,
): { code: CodeErreur; message: string } | null {
  if (fichier.size === 0) {
    return { code: "FICHIER_INVALIDE", message: "Le fichier est vide. Choisissez un CV au format PDF." };
  }
  if (!ressembleAUnPdf(fichier)) {
    return {
      code: "FICHIER_INVALIDE",
      message: "Ce fichier n'est pas un PDF. Seuls les CV au format PDF sont acceptés.",
    };
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return { code: "FICHIER_TROP_LOURD", message: MESSAGE_TROP_LOURD };
  }
  return null;
}

/** Vrai si l'objet a la forme `{ code, message }` des erreurs de l'API. */
function estReponseErreur(valeur: unknown): valeur is ReponseErreur {
  if (typeof valeur !== "object" || valeur === null) return false;
  const v = valeur as Record<string, unknown>;
  return typeof v.code === "string" && typeof v.message === "string";
}

/** Message à afficher quand la réponse n'est pas du JSON (proxy, hébergeur…). */
function messageSansJson(statut: number): string {
  if (statut === 413) {
    return "Le fichier est trop lourd pour être envoyé (limite de l'hébergement : 4,5 Mo). Choisissez un PDF de 4 Mo au plus.";
  }
  if (statut >= 500) {
    return "Le serveur ne répond pas correctement pour le moment. Réessayez dans quelques minutes.";
  }
  return `Réponse inattendue du serveur (erreur ${statut}). Réessayez ou choisissez un autre fichier.`;
}

/**
 * Envoie un CV à la route d'extraction.
 * `envoi` permet aux tests de remplacer `fetch` ; en production, on garde la valeur par défaut.
 */
export async function envoyerCV(
  fichier: File,
  envoi: typeof fetch = (...args) => fetch(...args),
): Promise<ResultatEnvoi> {
  const erreurLocale = verifierFichierAvantEnvoi(fichier);
  if (erreurLocale) return { ok: false, ...erreurLocale };

  const formulaire = new FormData();
  formulaire.append("file", fichier);

  let reponse: Response;
  try {
    reponse = await envoi("/api/extract", { method: "POST", body: formulaire });
  } catch {
    return {
      ok: false,
      code: "RESEAU",
      message: "Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.",
    };
  }

  // On ne lit du JSON que si le serveur annonce du JSON.
  const typeContenu = reponse.headers.get("content-type") ?? "";
  if (!typeContenu.toLowerCase().includes("application/json")) {
    const code: CodeErreur | CodeClient =
      reponse.status === 413 ? "FICHIER_TROP_LOURD" : "REPONSE_INATTENDUE";
    return { ok: false, code, message: messageSansJson(reponse.status) };
  }

  let corps: unknown;
  try {
    corps = await reponse.json();
  } catch {
    return { ok: false, code: "REPONSE_INATTENDUE", message: messageSansJson(reponse.status) };
  }

  if (!reponse.ok) {
    if (estReponseErreur(corps)) {
      return { ok: false, code: corps.code, message: corps.message };
    }
    return { ok: false, code: "REPONSE_INATTENDUE", message: messageSansJson(reponse.status) };
  }

  // Le contenu de la fiche sera validé par Zod en T2, avant tout affichage.
  return { ok: true, donnees: corps as ReponseExtraction };
}
