/**
 * Route POST /api/compare : validation du corps, quota de la route compare, erreurs.
 * Le quota et le modèle sont simulés : aucun appel à Redis ni à l'API.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurExtraction, type Mesures } from "@/lib/claude";

const { verifierQuota, comparer } = vi.hoisted(() => ({ verifierQuota: vi.fn(), comparer: vi.fn() }));
vi.mock("@/lib/ratelimit", async (original) => ({
  ...(await original<typeof import("@/lib/ratelimit")>()),
  verifierQuota,
}));
vi.mock("@/lib/compare", async (original) => ({
  ...(await original<typeof import("@/lib/compare")>()),
  comparer,
}));

const { POST } = await import("@/app/api/compare/route");

const fiche = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "cv-01-lea-fictivia.json"), "utf8"));
const mesures: Mesures = { modele: "modele-test", dureeMs: 900, jetonsEntree: 2000, jetonsSortie: 300, nouvelEssai: false, sansAppelOutil: 0, sortiesInvalides: 0 };
const resultats = [
  { critere: "Pratique de React", statut: "present", justification: "React", justificationRejetee: false },
  { critere: "Expérience de Kotlin", statut: "non_trouve", justification: null, justificationRejetee: true },
];

const requete = (corps: unknown) =>
  new Request("http://localhost/api/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
  });

let journal: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("CLAUDE_MODEL", "modele-test");
  verifierQuota.mockReset().mockResolvedValue({ ok: true });
  comparer.mockReset().mockResolvedValue({ resultats, mesures, justificationsRejetees: 1 });
  journal = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  journal.mockRestore();
});

describe("POST /api/compare", () => {
  it("renvoie 200 { resultats } et consulte le quota de la route compare", async () => {
    const reponse = await POST(requete({ fiche, criteres: ["Pratique de React", "Expérience de Kotlin"] }));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ resultats });
    expect(verifierQuota).toHaveBeenCalledWith("compare", expect.any(String));
    expect(comparer).toHaveBeenCalledWith(fiche, ["Pratique de React", "Expérience de Kotlin"], "modele-test");
  });

  it("21 critères → 400 ENTREE_INVALIDE, sans quota ni modèle", async () => {
    const criteres = Array.from({ length: 21 }, (_, i) => `Critère ${i + 1}`);
    const reponse = await POST(requete({ fiche, criteres }));
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps.code).toBe("ENTREE_INVALIDE");
    expect(corps.message).toMatch(/de 1 à 20 critères/);
    expect(verifierQuota).not.toHaveBeenCalled();
    expect(comparer).not.toHaveBeenCalled();
  });

  it("aucun critère, ou un critère de plus de 200 caractères → 400", async () => {
    expect((await POST(requete({ fiche, criteres: [] }))).status).toBe(400);
    expect((await POST(requete({ fiche, criteres: ["x".repeat(201)] }))).status).toBe(400);
    expect((await POST(requete({ fiche, criteres: ["   "] }))).status).toBe(400);
  });

  it("fiche non conforme ou corps qui n'est pas du JSON → 400 ENTREE_INVALIDE", async () => {
    const invalide = { ...fiche, contact: { ...fiche.contact, email: "pas-un-email" } };
    expect((await POST(requete({ fiche: invalide, criteres: ["React"] }))).status).toBe(400);
    const pasJson = await POST(requete("{pas du json"));
    expect(pasJson.status).toBe(400);
    expect(await pasJson.json()).toMatchObject({ code: "ENTREE_INVALIDE" });
  });

  it("quota atteint → 429 avec Retry-After, sans appel au modèle", async () => {
    verifierQuota.mockResolvedValue({ ok: false, code: "QUOTA_IP", reset: Date.now() + 120_000 });
    const reponse = await POST(requete({ fiche, criteres: ["React"] }));
    expect(reponse.status).toBe(429);
    expect(Number(reponse.headers.get("retry-after"))).toBeGreaterThan(100);
    expect((await reponse.json()).message).toMatch(/comparaisons/);
    expect(comparer).not.toHaveBeenCalled();
  });

  it("sortie toujours invalide → 422 COMPARAISON_IMPOSSIBLE ; API indisponible → 502", async () => {
    comparer.mockRejectedValueOnce(new ErreurExtraction("COMPARAISON_IMPOSSIBLE", "La comparaison n'a pas pu être faite.", mesures));
    const r422 = await POST(requete({ fiche, criteres: ["React"] }));
    expect(r422.status).toBe(422);
    expect(await r422.json()).toEqual({ code: "COMPARAISON_IMPOSSIBLE", message: "La comparaison n'a pas pu être faite." });
    expect(JSON.parse(journal.mock.calls[0]![0] as string)).toMatchObject({ statut: "comparaison_impossible" });
    comparer.mockRejectedValueOnce(new ErreurExtraction("MODELE_INDISPONIBLE", "Service indisponible.", mesures));
    expect((await POST(requete({ fiche, criteres: ["React"] }))).status).toBe(502);
  });

  it("journalise des compteurs, jamais la fiche ni le texte des critères", async () => {
    await POST(requete({ fiche, criteres: ["Pratique de React", "Expérience de Kotlin"] }));
    const ligne = journal.mock.calls[0]![0] as string;
    expect(JSON.parse(ligne)).toMatchObject({ evenement: "comparaison", statut: "ok", criteres: 2, justificationsRejetees: 1 });
    expect(ligne).not.toContain("Kotlin");
    expect(ligne).not.toContain("Fictivia");
  });
});
