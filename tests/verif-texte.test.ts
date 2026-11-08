import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cheminsAVerifier, normaliser, normaliserUrl } from "@/lib/verif-texte";
import type { FicheCV } from "@/lib/schemas";

/** Fiche minimale : seuls les champs utiles au test sont remplis. */
function fiche(modif: (f: FicheCV) => void = () => {}): FicheCV {
  const f: FicheCV = {
    identite: { nomComplet: null, titre: null, ville: null, pays: null },
    contact: { email: null, telephone: null, linkedin: null, github: null, siteWeb: null },
    competences: [],
    experiences: [],
    formations: [],
    langues: [],
    langueDuCV: "fr",
  };
  modif(f);
  return f;
}

describe("cheminsAVerifier", () => {
  it("met dans aVerifier le chemin d'une valeur absente du texte", () => {
    const f = fiche((f) => {
      f.identite.nomComplet = "Léa Fictivia";
      f.identite.ville = "Paris"; // absente
    });
    expect(cheminsAVerifier(f, "Léa Fictivia\nLyon, France")).toEqual(["identite.ville"]);
  });

  it("retrouve une valeur coupée par un retour à la ligne, en majuscules, avec ligature ou accent décomposé", () => {
    const f = fiche((f) => {
      f.identite.titre = "Développeuse full-stack TypeScript";
      f.competences = ["Configuration", "Fiscalité"];
      f.experiences = [{ poste: "Chef de projet", entreprise: null, lieu: null, debut: null, fin: null, description: null }];
    });
    // « ﬁ » est une ligature (U+FB01) ; « é » est un « é » décomposé.
    const texte = "DÉVELOPPEUSE\nFULL-STACK   TypeScript\nConﬁguration, Fiscalité\nCHEF DE\nPROJET";
    expect(cheminsAVerifier(f, texte)).toEqual([]);
  });

  it("téléphone : sans indicatif → retrouvé ; indicatif ajouté par le modèle → à vérifier", () => {
    const sansIndicatif = fiche((f) => (f.contact.telephone = "7700 900123"));
    expect(cheminsAVerifier(sansIndicatif, "Tél. : +44 7700 900123")).toEqual([]);

    const indicatifAjoute = fiche((f) => (f.contact.telephone = "+33 6 39 98 12 34"));
    expect(cheminsAVerifier(indicatifAjoute, "06 39 98 12 34")).toEqual(["contact.telephone"]);

    const autreFormat = fiche((f) => (f.contact.telephone = "06.39.98.12.34"));
    expect(cheminsAVerifier(autreFormat, "06 39 98 12 34")).toEqual([]);
  });

  it("URL avec ou sans https:// et www. → retrouvée", () => {
    const f = fiche((f) => {
      f.contact.siteWeb = "https://www.lea-fictivia.example.com/";
      f.contact.github = "github.example.com/lea";
      f.contact.linkedin = "http://linkedin.example.com/in/lea";
    });
    const texte = "lea-fictivia.example.com · https://github.example.com/lea · www.linkedin.example.com/in/lea";
    expect(cheminsAVerifier(f, texte)).toEqual([]);
  });

  it("n'ajoute jamais une description à aVerifier", () => {
    const f = fiche((f) => {
      f.experiences = [
        { poste: null, entreprise: null, lieu: null, debut: null, fin: null, description: "Texte reformulé absent du CV" },
      ];
    });
    expect(cheminsAVerifier(f, "Un tout autre texte")).toEqual([]);
  });

  it("PDF sans texte : tous les champs courts remplis sont à vérifier, jamais les null", () => {
    const f = fiche((f) => {
      f.identite.nomComplet = "Chloé Démo";
      f.contact.email = "chloe.demo@example.com";
      f.competences = ["Expo"];
      f.langues = [{ langue: "Français", niveau: null }];
    });
    expect(cheminsAVerifier(f, "   \n ")).toEqual([
      "identite.nomComplet",
      "contact.email",
      "competences.0",
      "langues.0.langue",
    ]);
  });

  it("la réponse attendue d'un CV fictif n'a rien à vérifier contre son propre texte", async () => {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const dossier = join(import.meta.dirname, "..", "samples");
    const document = await getDocumentProxy(new Uint8Array(readFileSync(join(dossier, "cv-02-sam-placeholder.pdf"))));
    const { text } = await extractText(document, { mergePages: true });
    await document.loadingTask.destroy();
    const attendue = JSON.parse(readFileSync(join(dossier, "cv-02-sam-placeholder.json"), "utf8"));
    expect(cheminsAVerifier(attendue, text)).toEqual([]);
  });
});

describe("normalisations", () => {
  it("normaliser fusionne espaces et retours, passe en minuscules et applique NFKC", () => {
    expect(normaliser("  ConﬁG \n  Été ")).toBe("config été");
  });

  it("normaliserUrl retire le protocole, www. et la barre finale", () => {
    expect(normaliserUrl("HTTPS://www.Exemple.example.com/profil/")).toBe("exemple.example.com/profil");
  });
});
