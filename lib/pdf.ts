/**
 * Contrôles d'un fichier PDF reçu, avant tout autre traitement, et lecture de son texte.
 *
 * Tout se passe en mémoire : les octets ne sont jamais écrits sur disque.
 * Le PDF est ouvert une seule fois avec unpdf (PDF.js sans dépendance native) :
 * la même lecture donne le nombre de pages et le texte, utilisé ensuite par
 * lib/verif-texte.ts pour chercher les valeurs extraites par le modèle.
 */
import { extractText, getDocumentProxy } from "unpdf";
import type { CodeErreur } from "@/lib/erreurs";
import { PAGES_MAX, TAILLE_MAX_OCTETS } from "@/lib/limites";

export { PAGES_MAX, TAILLE_MAX_OCTETS };

/** Signature présente au début de tout fichier PDF : « %PDF- ». */
const SIGNATURE_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * Taille maximale d'une image décodée par PDF.js (en pixels) : un PDF reçu n'est pas
 * digne de confiance, et une image déclarée immense ne doit pas épuiser la mémoire.
 */
const IMAGE_MAX_PIXELS = 16_777_216;

export type VerdictPdf =
  | {
      ok: true;
      pages: number;
      /** Texte du PDF, toutes pages réunies ; chaîne vide pour un PDF scanné. */
      texte: string;
    }
  | {
      ok: false;
      code: Extract<CodeErreur, "FICHIER_INVALIDE" | "FICHIER_TROP_LOURD" | "TROP_DE_PAGES">;
      statut: 400 | 413;
      message: string;
    };

/** Vrai si les octets commencent par la signature « %PDF- ». */
export function aSignaturePdf(octets: Uint8Array): boolean {
  return SIGNATURE_PDF.every((octet, i) => octets[i] === octet);
}

/**
 * Vérifie qu'un fichier est un PDF acceptable : non vide, de 4 Mo au plus,
 * avec la signature « %PDF- », lisible, et de 5 pages au plus ; si oui, renvoie aussi son texte.
 *
 * Fonction sans effet de bord : elle ne modifie pas les octets reçus et n'écrit rien.
 * Elle est asynchrone, car la lecture par unpdf l'est.
 */
export async function verifierPdf(octets: Uint8Array): Promise<VerdictPdf> {
  if (octets.byteLength === 0) {
    return {
      ok: false,
      code: "FICHIER_INVALIDE",
      statut: 400,
      message: "Le fichier est vide. Choisissez un CV au format PDF.",
    };
  }

  // La taille est contrôlée avant toute lecture du contenu.
  if (octets.byteLength > TAILLE_MAX_OCTETS) {
    return {
      ok: false,
      code: "FICHIER_TROP_LOURD",
      statut: 413,
      message: "Le fichier dépasse 4 Mo. Choisissez un PDF plus léger.",
    };
  }

  if (!aSignaturePdf(octets)) {
    return {
      ok: false,
      code: "FICHIER_INVALIDE",
      statut: 400,
      message: "Ce fichier n'est pas un PDF. Seuls les CV au format PDF sont acceptés.",
    };
  }

  // PDF.js peut s'approprier le tampon reçu : on lui passe une copie,
  // pour ne jamais toucher aux octets de l'appelant.
  let document: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    document = await getDocumentProxy(new Uint8Array(octets), { maxImageSize: IMAGE_MAX_PIXELS });
  } catch {
    return {
      ok: false,
      code: "FICHIER_INVALIDE",
      statut: 400,
      message: "Ce PDF est illisible ou endommagé. Essayez un autre fichier.",
    };
  }

  try {
    // Le nombre de pages est contrôlé avant d'extraire le texte de toutes les pages.
    const pages = document.numPages;
    if (pages > PAGES_MAX) {
      return {
        ok: false,
        code: "TROP_DE_PAGES",
        statut: 400,
        message: `Ce PDF fait ${pages} pages. Un CV de ${PAGES_MAX} pages au plus est accepté.`,
      };
    }
    const { text } = await extractText(document, { mergePages: true });
    return { ok: true, pages, texte: text };
  } catch {
    return {
      ok: false,
      code: "FICHIER_INVALIDE",
      statut: 400,
      message: "Ce PDF est illisible ou endommagé. Essayez un autre fichier.",
    };
  } finally {
    // Libère la mémoire du document (dans cette version de PDF.js, via sa tâche de chargement).
    await document.loadingTask.destroy();
  }
}
