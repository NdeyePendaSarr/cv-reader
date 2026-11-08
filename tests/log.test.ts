import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { formaterLigne, journaliser, type LigneJournal } from "@/lib/log";
import { valeursCourtes } from "@/lib/verif-texte";

const fiche = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "samples", "cv-01-lea-fictivia.json"), "utf8"),
);

const ligne: LigneJournal = {
  evenement: "extraction",
  statut: "ok",
  dureeMs: 4200,
  jetonsEntree: 3500,
  jetonsSortie: 900,
  modele: "modele-test",
  nouvelEssai: false,
  sansAppelOutil: 0,
  sortiesInvalides: 0,
  aVerifier: 2,
};

describe("journal", () => {
  it("écrit une seule ligne JSON avec les mesures", () => {
    const ecrire = vi.fn();
    journaliser(ligne, ecrire);
    expect(ecrire).toHaveBeenCalledTimes(1);
    const texte = ecrire.mock.calls[0]![0] as string;
    expect(texte).not.toContain("\n");
    expect(JSON.parse(texte)).toEqual(ligne);
  });

  it("ne contient aucun champ de la fiche, même si l'appelant en passe", () => {
    // Un appelant négligent étale toute la fiche et une IP dans la ligne : rien ne doit passer.
    const piege = { ...ligne, fiche, ip: "203.0.113.7", empreinte: "abc123", texte: "contenu du CV" } as LigneJournal;
    const texte = formaterLigne(piege);
    for (const { valeur } of valeursCourtes(fiche)) {
      if (valeur && valeur.length > 3) expect(texte).not.toContain(valeur);
    }
    for (const description of fiche.experiences.map((e: { description: string }) => e.description)) {
      expect(texte).not.toContain(description);
    }
    expect(texte).not.toContain("203.0.113.7");
    expect(texte).not.toContain("abc123");
    expect(Object.keys(JSON.parse(texte))).toEqual(Object.keys(ligne));
  });
});
