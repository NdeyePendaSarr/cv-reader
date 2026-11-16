/**
 * Outils communs aux tests : fabrication de PDF en mémoire, avec pdf-lib ou écrits à la main
 * (bombe de décompression, texte démesuré).
 */
import { createDeflate } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";

/** Fabrique un PDF valide de `pages` pages, chacune avec une ligne de texte. */
export async function fabriquerPdf(pages: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const police = await document.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = document.addPage();
    page.drawText(`Page ${i}`, { x: 50, y: 700, size: 12, font: police });
  }
  return document.save();
}

/** Flux de contenu d'une page : son dictionnaire (sans /Length, ajouté ici) et ses octets. */
export interface FluxPage {
  dico: string;
  donnees: Uint8Array;
}

/**
 * Fabrique à la main un PDF d'une page par flux, avec une table xref exacte.
 * pdf-lib ne permet pas de poser un flux compressé arbitraire : on écrit donc le fichier
 * objet par objet (catalogue, arbre des pages, pages, flux de contenu).
 */
export function fabriquerPdfBrut(flux: readonly FluxPage[]): Uint8Array {
  const enc = new TextEncoder();
  const n = flux.length;
  // Objets : 1 catalogue, 2 arbre des pages, 3..n+2 pages, n+3..2n+2 flux.
  const objets: Uint8Array[] = [
    enc.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    enc.encode(`<< /Type /Pages /Kids [${flux.map((_, i) => `${3 + i} 0 R`).join(" ")}] /Count ${n} >>`),
    ...flux.map((_, i) =>
      enc.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${3 + n + i} 0 R ` +
          "/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>",
      ),
    ),
    ...flux.map((f) =>
      Buffer.concat([enc.encode(`<< ${f.dico} /Length ${f.donnees.length} >>\nstream\n`), f.donnees, enc.encode("\nendstream")]),
    ),
  ];
  const morceaux: Uint8Array[] = [enc.encode("%PDF-1.7\n")];
  const positions: number[] = [];
  let position = morceaux[0]!.length;
  objets.forEach((objet, i) => {
    positions.push(position);
    const bloc = Buffer.concat([enc.encode(`${i + 1} 0 obj\n`), objet, enc.encode("\nendobj\n")]);
    morceaux.push(bloc);
    position += bloc.length;
  });
  let xref = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) xref += `${String(p).padStart(10, "0")} 00000 n \n`;
  morceaux.push(enc.encode(`${xref}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`));
  return new Uint8Array(Buffer.concat(morceaux));
}

/** Ligne de contenu PDF qui écrit 64 « A » : répétée, elle forme un texte énorme mais très compressible. */
const LIGNE_DE_TEXTE = "BT /F1 1 Tf 0 0 Td (" + "A".repeat(64) + ") Tj ET\n";

/**
 * Bombe de décompression : `mo` Mo de contenu de page, compressés en FlateDecode (environ 1 Mo pour 300 Mo).
 * La compression se fait par morceaux de 1 Mo, sans jamais tenir les `mo` Mo en mémoire.
 */
export async function fabriquerBombeFlate(mo: number): Promise<FluxPage> {
  const unMo = Buffer.alloc(1024 * 1024);
  const ligne = Buffer.from(LIGNE_DE_TEXTE);
  for (let i = 0; i + ligne.length <= unMo.length; i += ligne.length) ligne.copy(unMo, i);
  const compresseur = createDeflate({ level: 9 });
  const sortie: Buffer[] = [];
  compresseur.on("data", (morceau: Buffer) => sortie.push(morceau));
  const fini = new Promise<void>((ok, ko) => {
    compresseur.on("end", ok);
    compresseur.on("error", ko);
  });
  for (let i = 0; i < mo; i++) {
    if (!compresseur.write(unMo)) await new Promise((ok) => compresseur.once("drain", ok));
  }
  compresseur.end();
  await fini;
  return { dico: "/Filter /FlateDecode", donnees: new Uint8Array(Buffer.concat(sortie)) };
}

/** Contenu de page non compressé qui écrit au moins `caracteres` caractères de texte. */
export function fluxTexteLong(caracteres: number): FluxPage {
  const lignes = Math.ceil(caracteres / 64);
  return { dico: "", donnees: new TextEncoder().encode(LIGNE_DE_TEXTE.repeat(lignes)) };
}

/** Octets qui commencent par « %PDF- » mais dépassent `taille` (contenu sans importance). */
export function octetsTropLourds(taille: number): Uint8Array {
  const octets = new Uint8Array(taille + 1);
  octets.set(new TextEncoder().encode("%PDF-1.7\n"));
  return octets;
}
