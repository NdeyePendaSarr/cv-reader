/**
 * Aperçu de partage (LinkedIn, messageries) : image app/opengraph-image.tsx et métadonnées (lib/metadonnees.ts).
 */
import { describe, expect, it } from "vitest";
import ImagePartage, { alt, contentType, size } from "@/app/opengraph-image";
import { adresseDeBase, METADONNEES as metadata } from "@/lib/metadonnees";

/** Largeur et hauteur lues dans l'en-tête IHDR d'un PNG. */
function dimensionsPng(octets: Uint8Array): { largeur: number; hauteur: number } {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return { largeur: vue.getUint32(16), hauteur: vue.getUint32(20) };
}

describe("image de partage", () => {
  it("déclare un PNG de 1200 × 630 avec un texte alternatif en français", () => {
    expect(contentType).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(alt).toMatch(/CV Reader/);
  });

  it("produit vraiment un PNG de 1200 × 630", async () => {
    const reponse = await ImagePartage();
    const octets = new Uint8Array(await reponse.arrayBuffer());
    expect([...octets.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(dimensionsPng(octets)).toEqual({ largeur: 1200, hauteur: 630 });
  }, 30_000);

  it("les liens absolus de l'aperçu pointent vers le domaine de production fourni par Vercel", () => {
    expect(adresseDeBase("cv-reader-ruddy.vercel.app").href).toBe("https://cv-reader-ruddy.vercel.app/");
    expect(adresseDeBase(undefined).href).toBe("http://localhost:3000/");
  });

  it("les métadonnées Open Graph et Twitter sont en français, avec une grande image", () => {
    expect(metadata.openGraph).toMatchObject({ type: "website", locale: "fr_FR", siteName: "CV Reader" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
