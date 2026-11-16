import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  DECOMPRESSE_MAX_OCTETS,
  DELAI_LECTURE_MS,
  PAGES_MAX,
  TAILLE_MAX_OCTETS,
  TEXTE_MAX_CARACTERES,
  verifierPdf,
} from "@/lib/pdf";
import { fabriquerBombeFlate, fabriquerPdf, fabriquerPdfBrut, fluxTexteLong, octetsTropLourds } from "./outils";

describe("verifierPdf", () => {
  it("accepte un PDF valide et renvoie son nombre de pages et son texte, en une seule lecture", async () => {
    const verdict = await verifierPdf(await fabriquerPdf(2));
    expect(verdict).toMatchObject({ ok: true, pages: 2 });
    if (verdict.ok) {
      expect(verdict.texte).toContain("Page 1");
      expect(verdict.texte).toContain("Page 2");
    }
  });

  it("accepte un PDF de 5 pages exactement", async () => {
    expect(await verifierPdf(await fabriquerPdf(PAGES_MAX))).toMatchObject({ ok: true, pages: 5 });
  });

  it("refuse un fichier vide (400 FICHIER_INVALIDE)", async () => {
    const verdict = await verifierPdf(new Uint8Array(0));
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_INVALIDE", statut: 400 });
  });

  it("refuse un fichier sans signature %PDF- (400 FICHIER_INVALIDE)", async () => {
    const texte = new TextEncoder().encode("Bonjour, je ne suis pas un PDF.");
    const verdict = await verifierPdf(texte);
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_INVALIDE", statut: 400 });
    if (!verdict.ok) expect(verdict.message).toMatch(/n'est pas un PDF/);
  });

  it("refuse une signature placée ailleurs qu'au début", async () => {
    const decale = new TextEncoder().encode(" %PDF-1.7");
    expect(await verifierPdf(decale)).toMatchObject({ ok: false, code: "FICHIER_INVALIDE" });
  });

  it("refuse un PDF endommagé malgré sa signature (400 FICHIER_INVALIDE)", async () => {
    const abime = new TextEncoder().encode("%PDF-1.7\nceci n'est pas la suite d'un PDF");
    const verdict = await verifierPdf(abime);
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_INVALIDE", statut: 400 });
    if (!verdict.ok) expect(verdict.message).toMatch(/illisible/);
  });

  it("refuse un fichier de plus de 4 Mo (413 FICHIER_TROP_LOURD)", async () => {
    const verdict = await verifierPdf(octetsTropLourds(TAILLE_MAX_OCTETS));
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD", statut: 413 });
    if (!verdict.ok) expect(verdict.message).toMatch(/4 Mo/);
  });

  it("refuse un PDF de 6 pages (400 TROP_DE_PAGES)", async () => {
    const verdict = await verifierPdf(await fabriquerPdf(6));
    expect(verdict).toMatchObject({ ok: false, code: "TROP_DE_PAGES", statut: 400 });
    if (!verdict.ok) expect(verdict.message).toMatch(/6 pages/);
  });

  it("lit le texte d'un flux compressé ordinaire (FlateDecode) sous les plafonds", async () => {
    const contenu = new TextEncoder().encode("BT /F1 12 Tf 50 700 Td (Compresse mais lisible) Tj ET");
    const pdf = fabriquerPdfBrut([{ dico: "/Filter /FlateDecode", donnees: new Uint8Array(deflateSync(contenu)) }]);
    const verdict = await verifierPdf(pdf);
    expect(verdict).toMatchObject({ ok: true, pages: 1 });
    if (verdict.ok) expect(verdict.texte).toContain("Compresse mais lisible");
  });

  it("refuse la bombe de l'audit (1 Mo qui se décompresse en 300 Mo) : 413, vite et sans lire le texte", async () => {
    const bombe = await fabriquerBombeFlate(300);
    const pdf = fabriquerPdfBrut([bombe]);
    expect(pdf.byteLength).toBeLessThan(2 * 1024 * 1024);
    const debut = Date.now();
    const verdict = await verifierPdf(pdf);
    expect(Date.now() - debut).toBeLessThan(10_000);
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD", statut: 413 });
    if (!verdict.ok) expect(verdict.message).toMatch(/décompressé/);
  }, 60_000);

  it("additionne les flux : plusieurs flux sous le plafond chacun, au-dessus ensemble → 413", async () => {
    const morceau = await fabriquerBombeFlate(40);
    const pdf = fabriquerPdfBrut([morceau, morceau, morceau]);
    const verdict = await verifierPdf(pdf);
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD", statut: 413 });
  }, 60_000);

  it(`refuse un texte de plus de ${TEXTE_MAX_CARACTERES} caractères, même non compressé (413)`, async () => {
    const pdf = fabriquerPdfBrut([fluxTexteLong(TEXTE_MAX_CARACTERES + 1000)]);
    expect(pdf.byteLength).toBeLessThan(DECOMPRESSE_MAX_OCTETS);
    const verdict = await verifierPdf(pdf);
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD", statut: 413 });
    if (!verdict.ok) expect(verdict.message).toMatch(/caractères/);
  });

  it("refuse une lecture qui dépasse le délai (400 FICHIER_INVALIDE)", async () => {
    const verdict = await verifierPdf(await fabriquerPdf(PAGES_MAX), { delaiMs: 0 });
    expect(verdict).toMatchObject({ ok: false, code: "FICHIER_INVALIDE", statut: 400 });
    if (!verdict.ok) expect(verdict.message).toMatch(/trop de temps/);
  });

  it(`garde un délai de lecture par défaut de ${DELAI_LECTURE_MS / 1000} s, sous la durée maximale de la route`, () => {
    expect(DELAI_LECTURE_MS).toBeGreaterThan(0);
    expect(DELAI_LECTURE_MS).toBeLessThan(120_000);
  });

  it("ne modifie pas les octets reçus", async () => {
    const octets = await fabriquerPdf(1);
    const copie = octets.slice();
    await verifierPdf(octets);
    expect(octets.byteLength).toBe(copie.byteLength);
    expect(octets).toEqual(copie);
  });
});
