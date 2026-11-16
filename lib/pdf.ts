/**
 * Contrôles d'un fichier PDF reçu, avant tout autre traitement, et lecture de son texte.
 *
 * Tout se passe en mémoire : les octets ne sont jamais écrits sur disque.
 * Le PDF est ouvert une seule fois avec unpdf (PDF.js sans dépendance native) :
 * la même lecture donne le nombre de pages et le texte, utilisé ensuite par
 * lib/verif-texte.ts pour chercher les valeurs extraites par le modèle.
 *
 * Un PDF de 1 Mo peut contenir un flux qui se décompresse en centaines de Mo (« bombe de
 * décompression ») : sans limite, sa lecture prenait plus de 3 minutes et 2 Go de mémoire.
 * Trois barrières, dans l'ordre :
 * 1. taille décompressée de tous les flux FlateDecode, mesurée avant d'ouvrir le PDF ;
 * 2. nombre de caractères du texte, compté pendant la lecture, qui s'arrête au plafond ;
 * 3. délai de lecture.
 * Limite connue : un flux encodé autrement (ASCIIHex, ASCII85, LZW…) échappe à la barrière 1 ;
 * les barrières 2 et 3 le bornent, mais le délai ne peut interrompre un calcul de PDF.js
 * qui ne rend jamais la main.
 */
import { constants as zlib, inflateSync } from "node:zlib";
import { getDocumentProxy } from "unpdf";
import type { CodeErreur } from "@/lib/erreurs";
import { PAGES_MAX, TAILLE_MAX_OCTETS } from "@/lib/limites";

export { PAGES_MAX, TAILLE_MAX_OCTETS };

/**
 * Taille décompressée maximale, tous flux FlateDecode confondus : 100 Mo.
 * Un CV de 4 Mo en demande bien moins, même avec des images ; la bombe de l'audit en fait 300.
 */
export const DECOMPRESSE_MAX_OCTETS = 100 * 1024 * 1024;

/** Nombre maximal de caractères de texte : un CV de 5 pages en compte quelques dizaines de milliers. */
export const TEXTE_MAX_CARACTERES = 100_000;

/** Délai maximal de lecture du PDF (ouverture et texte), bien sous la durée maximale de la route (120 s). */
export const DELAI_LECTURE_MS = 15_000;

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

const DEBUT_FLUX = Buffer.from("stream");
const FIN_FLUX = Buffer.from("endstream");

/**
 * Vrai si la somme des tailles décompressées des flux FlateDecode dépasse `plafond`.
 *
 * Chaque flux (entre « stream » et « endstream ») est décompressé avec un maximum de sortie
 * égal à ce qui reste du plafond : un flux trop gros s'arrête donc dès le dépassement, sans
 * jamais occuper plus que le plafond en mémoire. Le dictionnaire du flux n'est pas lu : un nom
 * de filtre déguisé (« /Flate#44ecode ») ne peut pas le faire échapper. Un flux qui n'est pas
 * du zlib (image JPEG, texte en clair) échoue dès son en-tête et ne compte pas.
 */
export function depasseTailleDecompressee(octets: Uint8Array, plafond: number = DECOMPRESSE_MAX_OCTETS): boolean {
  const tampon = Buffer.from(octets.buffer, octets.byteOffset, octets.byteLength);
  let reste = plafond;
  let position = 0;
  for (;;) {
    const mot = tampon.indexOf(DEBUT_FLUX, position);
    if (mot === -1) return false;
    // « endstream » contient « stream » : ce n'est pas un début de flux.
    if (mot >= 3 && tampon.toString("latin1", mot - 3, mot) === "end") {
      position = mot + DEBUT_FLUX.length;
      continue;
    }
    // Les données commencent après le retour à la ligne qui suit le mot-clé (CRLF ou LF).
    let debut = mot + DEBUT_FLUX.length;
    if (tampon[debut] === 0x0d) debut++;
    if (tampon[debut] === 0x0a) debut++;
    const fin = tampon.indexOf(FIN_FLUX, debut);
    if (fin === -1) return false;
    try {
      // Z_SYNC_FLUSH : un flux tronqué compte pour ce qu'il donne, au lieu d'être ignoré.
      const sortie = inflateSync(tampon.subarray(debut, fin), { maxOutputLength: reste + 1, finishFlush: zlib.Z_SYNC_FLUSH });
      reste -= sortie.byteLength;
      if (reste < 0) return true;
    } catch (erreur) {
      if ((erreur as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") return true;
      // Autre erreur : ce flux n'est pas du zlib, il ne compte pas.
    }
    position = fin + FIN_FLUX.length;
  }
}

/** Levée quand le texte dépasse TEXTE_MAX_CARACTERES : la lecture s'arrête aussitôt. */
class TexteTropLong extends Error {
  constructor() {
    super("texte trop long");
    this.name = "TexteTropLong";
  }
}

/** Levée quand le délai de lecture est dépassé. */
class LectureTropLongue extends Error {
  constructor() {
    super("lecture trop longue");
    this.name = "LectureTropLongue";
  }
}

type Document = Awaited<ReturnType<typeof getDocumentProxy>>;

/**
 * Texte d'une page, lu en flux : le compteur commun de caractères est mis à jour à chaque morceau,
 * et la lecture est annulée dès qu'il dépasse le plafond (PDF.js arrête alors de décompresser le
 * contenu de la page). Même assemblage que `extractText` d'unpdf 2.1.0 : chaque élément de texte,
 * suivi d'un retour à la ligne s'il termine une ligne.
 */
async function lirePage(document: Document, numero: number, compteur: { caracteres: number }): Promise<string> {
  const page = await document.getPage(numero);
  const lecteur = page.streamTextContent().getReader();
  const morceaux: string[] = [];
  for (;;) {
    const { value, done } = await lecteur.read();
    if (done) break;
    for (const element of value.items) {
      if (!("str" in element)) continue; // marqueurs de contenu, sans texte
      morceaux.push(element.str + (element.hasEOL ? "\n" : ""));
      compteur.caracteres += element.str.length;
    }
    if (compteur.caracteres > TEXTE_MAX_CARACTERES) {
      // PDF.js exige une raison de type Error pour annuler.
      await lecteur.cancel(new TexteTropLong());
      throw new TexteTropLong();
    }
  }
  return morceaux.join("");
}

/**
 * Réunit les pages comme `extractText(…, { mergePages: true })` d'unpdf 2.1.0 (normalizeMergedText) :
 * espaces fusionnés sans casser les lignes, au plus une ligne vide.
 */
function reunirPages(textes: string[]): string {
  return textes
    .join("\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Rejette avec LectureTropLongue après `ms` millisecondes ; `annuler` libère le minuteur. */
function minuteur(ms: number): { promesse: Promise<never>; annuler: () => void } {
  let id: ReturnType<typeof setTimeout> | undefined;
  const promesse = new Promise<never>((_, rejeter) => {
    id = setTimeout(() => rejeter(new LectureTropLongue()), ms);
  });
  return { promesse, annuler: () => clearTimeout(id) };
}

const REFUS_DECOMPRESSE: VerdictPdf = {
  ok: false,
  code: "FICHIER_TROP_LOURD",
  statut: 413,
  message:
    "Le contenu de ce PDF dépasse 100 Mo une fois décompressé, bien plus qu'un CV. Exportez-le de nouveau en PDF, ou choisissez un autre fichier.",
};

const REFUS_TEXTE: VerdictPdf = {
  ok: false,
  code: "FICHIER_TROP_LOURD",
  statut: 413,
  message: `Ce PDF contient plus de ${TEXTE_MAX_CARACTERES.toLocaleString("fr-FR")} caractères de texte, bien plus qu'un CV. Choisissez un autre fichier.`,
};

const REFUS_DELAI: VerdictPdf = {
  ok: false,
  code: "FICHIER_INVALIDE",
  statut: 400,
  message: "La lecture de ce PDF prend trop de temps. Exportez-le de nouveau en PDF, ou choisissez un autre fichier.",
};

const REFUS_ILLISIBLE: VerdictPdf = {
  ok: false,
  code: "FICHIER_INVALIDE",
  statut: 400,
  message: "Ce PDF est illisible ou endommagé. Essayez un autre fichier.",
};

/** Refus d'un fichier (la branche « ok: false » de VerdictPdf). */
export type RefusPdf = Extract<VerdictPdf, { ok: false }>;

/**
 * Contrôles légers, sans ouvrir le PDF : fichier non vide, de 4 Mo au plus, avec la signature « %PDF- ».
 * Renvoie le refus, ou null si le fichier peut être ouvert. Assez peu coûteux pour passer avant le
 * quota : un fichier manifestement refusé ne consomme pas d'analyse (app/api/extract/route.ts).
 */
export function controlerEntete(octets: Uint8Array): RefusPdf | null {
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
  return null;
}

/**
 * Vérifie qu'un fichier est un PDF acceptable : non vide, de 4 Mo au plus,
 * avec la signature « %PDF- », de 100 Mo au plus une fois décompressé, lisible en moins de
 * `delaiMs`, de 5 pages au plus et de 100 000 caractères au plus ; si oui, renvoie aussi son texte.
 *
 * Fonction sans effet de bord : elle ne modifie pas les octets reçus et n'écrit rien.
 * Elle est asynchrone, car la lecture par unpdf l'est. `delaiMs` sert aux tests.
 */
export async function verifierPdf(
  octets: Uint8Array,
  { delaiMs = DELAI_LECTURE_MS }: { delaiMs?: number } = {},
): Promise<VerdictPdf> {
  const refus = controlerEntete(octets);
  if (refus) return refus;

  // Barrière 1 : taille décompressée, avant que PDF.js ne décompresse quoi que ce soit.
  if (depasseTailleDecompressee(octets)) return REFUS_DECOMPRESSE;

  // PDF.js peut s'approprier le tampon reçu : on lui passe une copie,
  // pour ne jamais toucher aux octets de l'appelant.
  const chargement = getDocumentProxy(new Uint8Array(octets), { maxImageSize: IMAGE_MAX_PIXELS });
  const ouvert: { document: Document | null } = { document: null };
  const delai = minuteur(delaiMs);
  const lecture = (async (): Promise<VerdictPdf> => {
    const document = await chargement;
    ouvert.document = document;
    // Le nombre de pages est contrôlé avant de lire le texte.
    const pages = document.numPages;
    if (pages > PAGES_MAX) {
      return {
        ok: false,
        code: "TROP_DE_PAGES",
        statut: 400,
        message: `Ce PDF fait ${pages} pages. Un CV de ${PAGES_MAX} pages au plus est accepté.`,
      };
    }
    // Barrière 2 : pages lues une à une, avec un compteur commun de caractères.
    const compteur = { caracteres: 0 };
    const textes: string[] = [];
    for (let numero = 1; numero <= pages; numero++) textes.push(await lirePage(document, numero, compteur));
    return { ok: true, pages, texte: reunirPages(textes) };
  })();
  // Si le délai l'emporte, la lecture abandonnée échouera à la destruction du document : sans effet.
  lecture.catch(() => {});

  try {
    // Barrière 3 : délai de lecture (ouverture comprise).
    return await Promise.race([lecture, delai.promesse]);
  } catch (erreur) {
    if (erreur instanceof TexteTropLong) return REFUS_TEXTE;
    if (erreur instanceof LectureTropLongue) return REFUS_DELAI;
    return REFUS_ILLISIBLE;
  } finally {
    delai.annuler();
    // Libère la mémoire du document (dans cette version de PDF.js, via sa tâche de chargement).
    // Document encore en cours d'ouverture (délai dépassé) : il sera libéré à la fin de l'ouverture,
    // sans faire attendre la réponse.
    if (ouvert.document) await ouvert.document.loadingTask.destroy();
    else void chargement.then((d) => d.loadingTask.destroy(), () => {});
  }
}
