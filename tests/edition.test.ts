import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  champsAVerifierRestants,
  compterCorrections,
  construireFicheValidee,
  depuisFiche,
  nomFichier,
  validerEdition,
  versFiche,
} from "@/lib/edition";
import { FicheValideeSchema, type FicheCV } from "@/lib/schemas";

function lireFiche(id: string): FicheCV {
  return JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", `${id}.json`), "utf8"));
}

const lea = () => lireFiche("cv-01-lea-fictivia");

describe("compterCorrections", () => {
  it("aucune modification → 0", () => {
    expect(compterCorrections(lea(), depuisFiche(lea()))).toBe(0);
  });

  it("un champ modifié → 1", () => {
    const edition = depuisFiche(lea());
    edition.identite.ville = "Grenoble";
    expect(compterCorrections(lea(), edition)).toBe(1);
  });

  it("une compétence ajoutée et une autre supprimée → 2", () => {
    const edition = depuisFiche(lea());
    edition.competences.splice(0, 1);
    edition.competences.push({ cle: "n1", origine: null, valeur: "Rust" });
    expect(compterCorrections(lea(), edition)).toBe(2);
  });

  it("une confirmation seule → 0 (la confirmation ne change aucune valeur)", () => {
    const fiche = lea();
    const edition = depuisFiche(fiche);
    const confirmes = new Set(["identite.ville"]);
    // La confirmation retire le champ des « à vérifier »…
    expect(champsAVerifierRestants(edition, fiche, ["identite.ville"], confirmes)).toEqual([]);
    // … sans modifier la fiche : aucune correction.
    expect(compterCorrections(fiche, edition)).toBe(0);
  });

  it("des espaces ajoutés aux bords ne comptent pas ; une valeur remise à l'identique non plus", () => {
    const edition = depuisFiche(lea());
    edition.identite.ville = "  Lyon ";
    edition.identite.pays = "Belgique";
    edition.identite.pays = "France";
    expect(compterCorrections(lea(), edition)).toBe(0);
  });

  it("un champ vidé compte comme une correction", () => {
    const edition = depuisFiche(lea());
    edition.contact.telephone = null;
    expect(compterCorrections(lea(), edition)).toBe(1);
  });

  it("élément conservé : un par champ modifié ; élément supprimé ou ajouté : un, quel que soit son nombre de champs", () => {
    const edition = depuisFiche(lea());
    edition.experiences[0]!.valeur.lieu = "Paris";
    edition.experiences[0]!.valeur.fin = "Octobre 2026";
    edition.formations.splice(1, 1); // suppression d'une formation (4 champs)
    edition.langues.push({ cle: "n2", origine: null, valeur: { langue: "Espagnol", niveau: "notions" } });
    expect(compterCorrections(lea(), edition)).toBe(2 + 1 + 1);
  });

  it("la suppression d'un élément ne décale pas la comparaison des suivants", () => {
    const edition = depuisFiche(lea());
    edition.competences.splice(0, 1); // les compétences suivantes gardent leur origine
    expect(compterCorrections(lea(), edition)).toBe(1);
  });
});

describe("champsAVerifierRestants", () => {
  it("un champ « à vérifier » disparaît quand il est confirmé ou modifié", () => {
    const fiche = lea();
    const aVerifier = ["identite.ville", "competences.2"];
    const edition = depuisFiche(fiche);
    expect(champsAVerifierRestants(edition, fiche, aVerifier, new Set()).map((c) => c.cle)).toEqual([
      "identite.ville",
      "competences@o2",
    ]);
    edition.identite.ville = "Grenoble";
    expect(champsAVerifierRestants(edition, fiche, aVerifier, new Set()).map((c) => c.cle)).toEqual(["competences@o2"]);
    expect(champsAVerifierRestants(edition, fiche, aVerifier, new Set(["competences.2"]))).toEqual([]);
  });

  it("suit l'élément après la suppression d'un élément précédent", () => {
    const fiche = lea();
    const edition = depuisFiche(fiche);
    edition.competences.splice(0, 1);
    const restants = champsAVerifierRestants(edition, fiche, ["competences.2"], new Set());
    expect(restants).toEqual([{ cle: "competences@o2", origine: "competences.2", valeur: fiche.competences[2] }]);
  });
});

describe("construireFicheValidee", () => {
  it("respecte FicheValideeSchema", () => {
    const edition = depuisFiche(lea());
    edition.identite.titre = "Développeuse TypeScript";
    const validee = construireFicheValidee({
      originale: lea(),
      edition,
      modele: "claude-haiku-5-5",
      aVerifier: [],
      confirmes: new Set(),
      maintenant: new Date("2026-11-09T10:00:00Z"),
    });
    expect(FicheValideeSchema.safeParse(validee).success).toBe(true);
    expect(validee).toMatchObject({
      versionSchema: 1,
      champsCorriges: 1,
      nonVerifiees: [],
      valideeLe: "2026-11-09T10:00:00.000Z",
      modele: "claude-haiku-5-5",
    });
    expect(validee.fiche.identite.titre).toBe("Développeuse TypeScript");
  });

  it("nonVerifiees : les valeurs encore « à vérifier », ni confirmées ni corrigées", () => {
    const edition = depuisFiche(lea());
    edition.identite.ville = "Grenoble"; // corrigée : n'est plus à vérifier
    const validee = construireFicheValidee({
      originale: lea(),
      edition,
      modele: "claude-haiku-5-5",
      aVerifier: ["identite.ville", "contact.telephone", "competences.2", "experiences.0.fin"],
      confirmes: new Set(["competences.2"]), // confirmée : n'est plus à vérifier
    });
    expect(validee.nonVerifiees).toEqual(["contact.telephone", "experiences.0.fin"]);
  });

  it("nonVerifiees : un élément supprimé n'y figure plus", () => {
    const edition = depuisFiche(lea());
    edition.experiences.splice(0, 1);
    const validee = construireFicheValidee({
      originale: lea(),
      edition,
      modele: "claude-haiku-5-5",
      aVerifier: ["experiences.0.fin", "experiences.1.lieu"],
      confirmes: new Set(),
    });
    expect(validee.nonVerifiees).toEqual(["experiences.1.lieu"]);
  });

  it("un champ vidé donne null, jamais une chaîne vide", () => {
    const edition = depuisFiche(lea());
    edition.identite.ville = "   ";
    edition.experiences[0]!.valeur.description = "";
    const validee = construireFicheValidee({
      originale: lea(),
      edition,
      modele: "claude-haiku-5-5",
      aVerifier: [],
      confirmes: new Set(),
    });
    expect(validee.fiche.identite.ville).toBeNull();
    expect(validee.fiche.experiences[0]!.description).toBeNull();
    expect(JSON.stringify(validee)).not.toContain('""');
  });
});

describe("validerEdition", () => {
  it("rattache les erreurs aux champs, en français", () => {
    const edition = depuisFiche(lea());
    edition.contact.email = "pas-un-email";
    edition.competences.push({ cle: "n7", origine: null, valeur: "  " });
    const resultat = validerEdition(edition);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreurs["contact.email"]).toMatch(/Adresse e-mail invalide/);
      expect(resultat.erreurs["competences@n7"]).toMatch(/ne peut pas être vide/);
    }
  });

  it("accepte une fiche correcte et la normalise", () => {
    const edition = depuisFiche(lea());
    edition.identite.nomComplet = "  Léa Fictivia ";
    const resultat = validerEdition(edition);
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.fiche.identite.nomComplet).toBe("Léa Fictivia");
  });
});

describe("versFiche", () => {
  it("retrouve la fiche d'origine sans modification", () => {
    expect(versFiche(depuisFiche(lea()))).toEqual(lea());
  });
});

describe("nomFichier", () => {
  const date = new Date(2026, 10, 9, 15, 30); // 9 novembre 2026, heure locale

  it("retire les accents, passe en minuscules et remplace les espaces par des tirets", () => {
    expect(nomFichier("Chloé Démo", date)).toBe("fiche-chloe-demo-2026-11-09.json");
    expect(nomFichier("  Élise   N'Diaye-Ćorić ", date)).toBe("fiche-elise-n-diaye-coric-2026-11-09.json");
  });

  it("sans nom : « sans-nom »", () => {
    expect(nomFichier(null, date)).toBe("fiche-sans-nom-2026-11-09.json");
    expect(nomFichier("  ", date)).toBe("fiche-sans-nom-2026-11-09.json");
  });
});
