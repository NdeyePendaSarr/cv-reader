/**
 * Route POST /api/extract : ordre des étapes et format des erreurs.
 * Le quota et le modèle sont simulés : aucun appel à Redis ni à l'API.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurExtraction, type Mesures } from "@/lib/claude";
import { TAILLE_MAX_OCTETS } from "@/lib/limites";
import { fabriquerPdf, octetsTropLourds } from "./outils";

const { verifierQuota, extraire } = vi.hoisted(() => ({ verifierQuota: vi.fn(), extraire: vi.fn() }));

vi.mock("@/lib/ratelimit", async (original) => ({
  ...(await original<typeof import("@/lib/ratelimit")>()),
  verifierQuota,
}));
vi.mock("@/lib/claude", async (original) => ({
  ...(await original<typeof import("@/lib/claude")>()),
  extraire,
}));

const { POST } = await import("@/app/api/extract/route");

const DOSSIER = join(import.meta.dirname, "..", "samples");
const ficheAttendue = JSON.parse(readFileSync(join(DOSSIER, "cv-01-lea-fictivia.json"), "utf8"));
const mesures: Mesures = { modele: "modele-test", dureeMs: 1234, jetonsEntree: 3000, jetonsSortie: 800, nouvelEssai: false, sansAppelOutil: 0, sortiesInvalides: 0 };

function requeteAvecFichier(octets: Uint8Array, nom = "cv.pdf"): Request {
  const formulaire = new FormData();
  formulaire.append("file", new File([octets as BlobPart], nom, { type: "application/pdf" }));
  return new Request("http://localhost/api/extract", { method: "POST", body: formulaire });
}

let journal: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("CLAUDE_MODEL", "modele-test");
  verifierQuota.mockReset().mockResolvedValue({ ok: true });
  extraire.mockReset();
  journal = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  journal.mockRestore();
});

describe("POST /api/extract", () => {
  it("renvoie 200 { fiche, aVerifier, modele, dureeMs } et vérifie les valeurs contre le texte du PDF", async () => {
    const fiche = structuredClone(ficheAttendue);
    fiche.identite.ville = "Grenoble"; // valeur absente du PDF : doit être à vérifier
    extraire.mockResolvedValue({ ...mesures, fiche });
    const octets = new Uint8Array(readFileSync(join(DOSSIER, "cv-01-lea-fictivia.pdf")));
    const reponse = await POST(requeteAvecFichier(octets));
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps).toEqual({ fiche, aVerifier: ["identite.ville"], modele: "modele-test", dureeMs: 1234 });
    expect(extraire).toHaveBeenCalledWith(octets, "modele-test");
  });

  it("écrit une ligne de journal sans contenu du CV", async () => {
    extraire.mockResolvedValue({ ...mesures, fiche: ficheAttendue });
    await POST(requeteAvecFichier(new Uint8Array(readFileSync(join(DOSSIER, "cv-01-lea-fictivia.pdf")))));
    expect(journal).toHaveBeenCalledTimes(1);
    const ligne = journal.mock.calls[0]![0] as string;
    expect(JSON.parse(ligne)).toMatchObject({ evenement: "extraction", statut: "ok", aVerifier: 0 });
    expect(ligne).not.toContain("Fictivia");
    expect(ligne).not.toContain("@example.com");
  });

  it("vérifie le quota en premier : 429 QUOTA_IP avec Retry-After, sans lire le PDF ni appeler le modèle", async () => {
    verifierQuota.mockResolvedValue({ ok: false, code: "QUOTA_IP", reset: Date.now() + 600_000 });
    const reponse = await POST(requeteAvecFichier(new TextEncoder().encode("pas un pdf")));
    expect(reponse.status).toBe(429);
    expect(Number(reponse.headers.get("retry-after"))).toBeGreaterThanOrEqual(599);
    const corps = await reponse.json();
    expect(corps.code).toBe("QUOTA_IP");
    expect(corps.message).toMatch(/10 minutes/);
    expect(extraire).not.toHaveBeenCalled();
  });

  it("429 PLAFOND_GLOBAL propose les CV fictifs", async () => {
    verifierQuota.mockResolvedValue({ ok: false, code: "PLAFOND_GLOBAL", reset: Date.now() + 3_600_000 });
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(1)));
    expect(reponse.status).toBe(429);
    expect(reponse.headers.get("retry-after")).toBeTruthy();
    expect((await reponse.json()).message).toMatch(/CV fictif/);
  });

  it("renvoie 400 FICHIER_INVALIDE pour un fichier qui n'est pas un PDF, sans appeler le modèle", async () => {
    const reponse = await POST(requeteAvecFichier(new TextEncoder().encode("bonjour")));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "FICHIER_INVALIDE" });
    expect(extraire).not.toHaveBeenCalled();
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
    const reponse = await POST(new Request("http://localhost/api/extract", { method: "POST", body: formulaire }));
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ code: "ENTREE_INVALIDE" });
  });

  it("renvoie 422 EXTRACTION_IMPOSSIBLE et journalise l'échec", async () => {
    extraire.mockRejectedValue(new ErreurExtraction("EXTRACTION_IMPOSSIBLE", "Extraction impossible.", { ...mesures, nouvelEssai: true }));
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(1)));
    expect(reponse.status).toBe(422);
    expect(await reponse.json()).toEqual({ code: "EXTRACTION_IMPOSSIBLE", message: "Extraction impossible." });
    expect(JSON.parse(journal.mock.calls[0]![0] as string)).toMatchObject({ statut: "extraction_impossible", nouvelEssai: true });
  });

  it("renvoie 502 MODELE_INDISPONIBLE si l'API ne répond pas", async () => {
    extraire.mockRejectedValue(new ErreurExtraction("MODELE_INDISPONIBLE", "Service indisponible.", mesures));
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(1)));
    expect(reponse.status).toBe(502);
    expect(await reponse.json()).toMatchObject({ code: "MODELE_INDISPONIBLE" });
  });

  it("renvoie 500 ERREUR_INTERNE si CLAUDE_MODEL manque, sans appeler le modèle", async () => {
    vi.stubEnv("CLAUDE_MODEL", undefined);
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(1)));
    expect(reponse.status).toBe(500);
    expect(await reponse.json()).toMatchObject({ code: "ERREUR_INTERNE" });
    expect(extraire).not.toHaveBeenCalled();
    erreurs.mockRestore();
  });

  it("erreur inattendue dont le message contient un texte de CV → 500, et seul son nom est journalisé", async () => {
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    extraire.mockRejectedValueOnce(new RangeError("Léa Fictivia, lea.fictivia@example.com, Atelier Exemple SAS"));
    const reponse = await POST(requeteAvecFichier(await fabriquerPdf(1)));
    expect(reponse.status).toBe(500);
    expect(erreurs.mock.calls).toEqual([["RangeError"]]);
    const ecrit = JSON.stringify(erreurs.mock.calls);
    for (const fragment of ["Fictivia", "@example.com", "Atelier Exemple"]) expect(ecrit).not.toContain(fragment);
    erreurs.mockRestore();
  });
});
