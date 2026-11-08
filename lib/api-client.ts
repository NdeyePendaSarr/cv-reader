/**
 * Client navigateur des routes POST /api/extract et POST /api/compare.
 *
 * Il contrôle le fichier avant l'envoi (type et taille), puis lit la réponse avec
 * prudence : au-delà de 4,5 Mo, Vercel répond lui-même 413 avec une page qui n'est
 * pas du JSON. Quoi qu'il arrive, l'appelant reçoit un message clair en français.
 */
import { z } from "zod";
import { formaterDelai } from "@/lib/delai";
import type { CodeErreur, ReponseErreur } from "@/lib/erreurs";
import { TAILLE_MAX_OCTETS } from "@/lib/limites";
import { FicheCVSchema, ReponseComparaisonSchema, type FicheCV, type ReponseComparaison } from "@/lib/schemas";

/** Réponse de la route en cas de succès, validée par Zod avant tout affichage. */
export const ReponseExtractionSchema = z.object({
  fiche: FicheCVSchema,
  aVerifier: z.array(z.string()),
  modele: z.string().min(1),
  dureeMs: z.number().nonnegative(),
});
export type ReponseExtraction = z.infer<typeof ReponseExtractionSchema>;

/** Codes propres au navigateur, quand la réponse du serveur est inexploitable. */
export type CodeClient = "RESEAU" | "REPONSE_INATTENDUE";

export type ResultatEnvoi =
  | { ok: true; donnees: ReponseExtraction }
  | {
      ok: false;
      code: CodeErreur | CodeClient;
      message: string;
      /** Pour un 429 : délai d'attente en secondes, lu dans l'en-tête Retry-After. */
      attenteSecondes?: number;
    };

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

/** Délai lu dans l'en-tête Retry-After (en secondes), ou undefined s'il est absent ou illisible. */
function lireAttente(reponse: Response): number | undefined {
  const valeur = Number(reponse.headers.get("retry-after"));
  return Number.isFinite(valeur) && valeur > 0 ? valeur : undefined;
}

/** Message à afficher quand la réponse n'est pas exploitable (pas du JSON, ou JSON inattendu). */
function messageSansJson(statut: number, attente?: number): string {
  if (statut === 413) {
    return "Le fichier est trop lourd pour être envoyé (limite de l'hébergement : 4,5 Mo). Choisissez un PDF de 4 Mo au plus.";
  }
  if (statut === 429) {
    const delai = attente ? ` Réessayez dans ${formaterDelai(attente)}.` : " Réessayez plus tard.";
    return `Trop d'analyses demandées.${delai} Les CV fictifs restent disponibles.`;
  }
  if (statut === 422) {
    return "Les informations de ce CV n'ont pas pu être extraites de façon fiable. Essayez un autre fichier, ou un CV fictif.";
  }
  if (statut === 502 || statut === 503 || statut === 504) {
    return "Le service d'analyse ne répond pas pour le moment. Réessayez dans quelques minutes, ou choisissez un CV fictif.";
  }
  if (statut >= 500) {
    return "Le serveur ne répond pas correctement pour le moment. Réessayez dans quelques minutes.";
  }
  return `Réponse inattendue du serveur (erreur ${statut}). Réessayez ou choisissez un autre fichier.`;
}

/** Code à renvoyer quand le corps de la réponse ne dit rien d'exploitable. */
function codeSansJson(statut: number): CodeErreur | CodeClient {
  if (statut === 413) return "FICHIER_TROP_LOURD";
  if (statut === 429) return "QUOTA_IP";
  if (statut === 422) return "EXTRACTION_IMPOSSIBLE";
  if (statut === 502 || statut === 503 || statut === 504) return "MODELE_INDISPONIBLE";
  return "REPONSE_INATTENDUE";
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
  return appelerApi(
    envoi,
    "/api/extract",
    { method: "POST", body: formulaire },
    ReponseExtractionSchema,
    "La fiche reçue est incomplète ou mal formée. Réessayez, ou choisissez un CV fictif.",
  );
}

/** Résultat d'un appel à une route de l'API, après lecture prudente de la réponse. */
export type ResultatApi<T> =
  | { ok: true; donnees: T }
  | { ok: false; code: CodeErreur | CodeClient; message: string; attenteSecondes?: number };

/**
 * Appelle une route et lit sa réponse avec prudence : JSON lu seulement s'il est annoncé,
 * erreurs `{ code, message }` transmises, réponses non JSON (413 de Vercel…) traduites en
 * message clair, et réponse 200 validée par Zod avant tout affichage.
 */
async function appelerApi<T>(
  envoi: typeof fetch,
  url: string,
  options: RequestInit,
  schema: z.ZodType<T>,
  messageMalForme: string,
): Promise<ResultatApi<T>> {
  let reponse: Response;
  try {
    reponse = await envoi(url, options);
  } catch {
    return {
      ok: false,
      code: "RESEAU",
      message: "Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.",
    };
  }

  const attente = reponse.status === 429 ? lireAttente(reponse) : undefined;
  const echec = (code: CodeErreur | CodeClient, message: string): ResultatApi<T> =>
    attente === undefined ? { ok: false, code, message } : { ok: false, code, message, attenteSecondes: attente };

  // On ne lit du JSON que si le serveur annonce du JSON.
  const typeContenu = reponse.headers.get("content-type") ?? "";
  if (!typeContenu.toLowerCase().includes("application/json")) {
    return echec(codeSansJson(reponse.status), messageSansJson(reponse.status, attente));
  }

  let corps: unknown;
  try {
    corps = await reponse.json();
  } catch {
    return echec("REPONSE_INATTENDUE", messageSansJson(reponse.status, attente));
  }

  if (!reponse.ok) {
    if (estReponseErreur(corps)) return echec(corps.code, corps.message);
    return echec(codeSansJson(reponse.status), messageSansJson(reponse.status, attente));
  }

  // La réponse est validée par Zod avant tout affichage, même si le serveur l'a déjà fait.
  const donnees = schema.safeParse(corps);
  if (!donnees.success) return echec("REPONSE_INATTENDUE", messageMalForme);
  return { ok: true, donnees: donnees.data };
}

/** Compare la fiche validée aux critères de l'offre (POST /api/compare). */
export async function comparerFiche(
  fiche: FicheCV,
  criteres: string[],
  envoi: typeof fetch = (...args) => fetch(...args),
): Promise<ResultatApi<ReponseComparaison>> {
  return appelerApi(
    envoi,
    "/api/compare",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fiche, criteres }) },
    ReponseComparaisonSchema,
    "Le résultat de la comparaison est incomplet ou mal formé. Réessayez.",
  );
}
