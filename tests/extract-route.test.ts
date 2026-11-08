/**
 * Route POST /api/extract (tranche T1) : erreurs au format { code, message },
 * et 501 pour un PDF valide tant que l'extraction n'existe pas.
 */
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/extract/route";
import { TAILLE_MAX_OCTETS } from "@/lib/limites";
import { fabriquerPdf, octetsTropLourds } from "./outils";

function requeteAvecFichier(octets: Uint8Array, nom = "cv.pdf"): Request {
  const formulaire = new FormData();
  formulaire.append("file", new File([octets as BlobPart], nom, { type: "application/pdf" }));
  return new Request("http://localhost/api/extract", { method: "POST", body: formulaire });
}

describe("POST /api/extract", () => {
  it("renvoie 501 EXTRACTION_PAS_ENCORE_DISPONIBLE pour un PDF valide", async () => {
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(3)));
    expect(reponse.status).toBe(501);
    expect(reponse.headers.get("content-type")).toMatch(/application\/json/);
    const corps = await reponse.json();
    expect(corps.code).toBe("EXTRACTION_PAS_ENCORE_DISPONIBLE");
    expect(corps.message).toMatch(/3 pages/);
  });

  it("renvoie 400 FICHIER_INVALIDE pour un fichier qui n'est pas un PDF", async () => {
    const reponse = await POST(requeteAvecFichier(new TextEncoder().encode("bonjour")));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "FICHIER_INVALIDE" });
  });

  it("renvoie 413 FICHIER_TROP_LOURD au-delà de 4 Mo, même si le navigateur est contourné", async () => {
    const reponse = await POST(requeteAvecFichier(octetsTropLourds(TAILLE_MAX_OCTETS)));
    expect(reponse.status).toBe(413);
    expect(await reponse.json()).toMatchObject({ code: "FICHIER_TROP_LOURD" });
  });

  it("renvoie 400 TROP_DE_PAGES pour un PDF de 6 pages", async () => {
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(6)));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "TROP_DE_PAGES" });
  });

  it("renvoie 400 ENTREE_INVALIDE sans champ « file »", async () => {
    const formulaire = new FormData();
    formulaire.append("autre", "valeur");
    const requete = new Request("http://localhost/api/extract", { method: "POST", body: formulaire });
    const reponse = await POST(requete);
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "ENTREE_INVALIDE" });
  });

  it("renvoie 400 ENTREE_INVALIDE pour un corps qui n'est pas un formulaire", async () => {
    const requete = new Request("http://localhost/api/extract", {
      method: "POST",
      body: JSON.stringify({ file: "x" }),
      headers: { "content-type": "application/json" },
    });
    const reponse = await POST(requete);
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "ENTREE_INVALIDE" });
  });
});
