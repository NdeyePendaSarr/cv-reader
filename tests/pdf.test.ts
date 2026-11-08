import { describe, expect, it } from "vitest";
import { PAGES_MAX, TAILLE_MAX_OCTETS, verifierPdf } from "@/lib/pdf";
import { fabriquerPdf, octetsTropLourds } from "./outils";

describe("verifierPdf", () => {
  it("accepte un PDF valide et renvoie son nombre de pages", async () => {
    expect(await verifierPdf(await fabriquerPdf(2))).toEqual({ ok: true, pages: 2 });
  });

  it("accepte un PDF de 5 pages exactement", async () => {
    expect(await verifierPdf(await fabriquerPdf(PAGES_MAX))).toEqual({ ok: true, pages: 5 });
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

  it("ne modifie pas les octets reçus", async () => {
    const octets = await fabriquerPdf(1);
    const copie = octets.slice();
    await verifierPdf(octets);
    expect(octets.byteLength).toBe(copie.byteLength);
    expect(octets).toEqual(copie);
  });
});
