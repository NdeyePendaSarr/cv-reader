/**
 * Outils communs aux tests : fabrication de PDF en mémoire avec pdf-lib.
 */
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

/** Octets qui commencent par « %PDF- » mais dépassent `taille` (contenu sans importance). */
export function octetsTropLourds(taille: number): Uint8Array {
  const octets = new Uint8Array(taille + 1);
  octets.set(new TextEncoder().encode("%PDF-1.7\n"));
  return octets;
}
