/**
 * Contrôles d'un fichier PDF reçu, avant tout autre traitement.
 *
 * Tout se passe en mémoire : les octets ne sont jamais écrits sur disque.
 * Le nombre de pages est lu avec unpdf (PDF.js sans dépendance native).
 */
import { getDocumentProxy } from "unpdf";
import type { CodeErreur } from "@/lib/erreurs";
import { PAGES_MAX, TAILLE_MAX_OCTETS } from "@/lib/limites";

export { PAGES_MAX, TAILLE_MAX_OCTETS };

/** Signature présente au début de tout fichier PDF : « %PDF- ». */
const SIGNATURE_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

export type VerdictPdf =
  | { ok: true; pages: number }
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
 * avec la signature « %PDF- », lisible, et de 5 pages au plus.
 *
 * Fonction sans effet de bord : elle ne modifie pas les octets reçus et n'écrit rien.
 * Elle est asynchrone, car la lecture du nombre de pages par unpdf l'est.
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
  let pages: number;
  try {
    const document = await getDocumentProxy(new Uint8Array(octets));
    pages = document.numPages;
    // Libère la mémoire du document (dans cette version de PDF.js, via sa tâche de chargement).
    await document.loadingTask.destroy();
  } catch {
    return {
      ok: false,
      code: "FICHIER_INVALIDE",
      statut: 400,
      message: "Ce PDF est illisible ou endommagé. Essayez un autre fichier.",
    };
  }

  if (pages > PAGES_MAX) {
    return {
      ok: false,
      code: "TROP_DE_PAGES",
      statut: 400,
      message: `Ce PDF fait ${pages} pages. Un CV de ${PAGES_MAX} pages au plus est accepté.`,
    };
  }

  return { ok: true, pages };
}
