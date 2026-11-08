import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CritereResultatSchema, FicheCVSchema, FicheValideeSchema } from "@/lib/schemas";

/** Une fiche complète, reprise d'une réponse attendue. */
function ficheComplete() {
  return JSON.parse(
    readFileSync(join(import.meta.dirname, "..", "samples", "cv-01-lea-fictivia.json"), "utf8"),
  );
}

describe("FicheCVSchema", () => {
  it("accepte une fiche complète", () => {
    expect(FicheCVSchema.safeParse(ficheComplete()).success).toBe(true);
  });

  it("accepte null pour une information absente", () => {
    const fiche = ficheComplete();
    fiche.contact.email = null;
    fiche.contact.telephone = null;
    expect(FicheCVSchema.safeParse(fiche).success).toBe(true);
  });

  it("refuse un e-mail invalide", () => {
    const fiche = ficheComplete();
    fiche.contact.email = "pas-un-email";
    expect(FicheCVSchema.safeParse(fiche).success).toBe(false);
  });

  it("refuse une chaîne vide (ou faite d'espaces) à la place de null", () => {
    const fiche = ficheComplete();
    fiche.identite.ville = "   ";
    expect(FicheCVSchema.safeParse(fiche).success).toBe(false);
  });

  it("refuse une compétence vide", () => {
    const fiche = ficheComplete();
    fiche.competences.push("");
    expect(FicheCVSchema.safeParse(fiche).success).toBe(false);
  });

  it("ne complète rien : un champ manquant est une erreur, pas une valeur par défaut", () => {
    const fiche = ficheComplete();
    delete fiche.contact.telephone;
    expect(FicheCVSchema.safeParse(fiche).success).toBe(false);
  });
});

describe("FicheValideeSchema", () => {
  it("accepte une fiche validée datée au format ISO", () => {
    const resultat = FicheValideeSchema.safeParse({
      versionSchema: 1,
      fiche: ficheComplete(),
      champsCorriges: 2,
      valideeLe: "2026-11-08T10:00:00Z",
      modele: "modele-de-test",
    });
    expect(resultat.success).toBe(true);
  });

  it("refuse une date qui n'est pas au format ISO", () => {
    const resultat = FicheValideeSchema.safeParse({
      versionSchema: 1,
      fiche: ficheComplete(),
      champsCorriges: 0,
      valideeLe: "8 novembre 2026",
      modele: "modele-de-test",
    });
    expect(resultat.success).toBe(false);
  });
});

describe("CritereResultatSchema", () => {
  it("accepte « présent » avec une justification", () => {
    const r = { critere: "Pratique de React", statut: "present", justification: "React" };
    expect(CritereResultatSchema.safeParse(r).success).toBe(true);
  });

  it("accepte « non trouvé » sans justification", () => {
    const r = { critere: "Pratique de React", statut: "non_trouve", justification: null };
    expect(CritereResultatSchema.safeParse(r).success).toBe(true);
  });

  it("refuse « présent » sans justification", () => {
    const r = { critere: "Pratique de React", statut: "present", justification: null };
    expect(CritereResultatSchema.safeParse(r).success).toBe(false);
  });

  it("refuse « non trouvé » avec une justification", () => {
    const r = { critere: "Pratique de React", statut: "non_trouve", justification: "React" };
    expect(CritereResultatSchema.safeParse(r).success).toBe(false);
  });
});
