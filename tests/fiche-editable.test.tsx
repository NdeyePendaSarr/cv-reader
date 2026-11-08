// @vitest-environment jsdom
/**
 * Formulaire de validation humaine (components/FicheEditable.tsx), testé dans un DOM simulé.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FicheEditable from "@/components/FicheEditable";
import { FicheValideeSchema, type FicheCV } from "@/lib/schemas";

const fiche: FicheCV = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "samples", "cv-08-chloe-demo.json"), "utf8"),
);

/** Fichiers « téléchargés » pendant le test : contenu et nom, sans navigation réelle. */
let telecharges: { nom: string; blob: Blob }[];
let dernierBlob: Blob | null;
let fetchEspion: ReturnType<typeof vi.fn>;

beforeEach(() => {
  telecharges = [];
  dernierBlob = null;
  // jsdom ne fournit pas URL.createObjectURL ; on garde le Blob pour lire le fichier produit.
  URL.createObjectURL = vi.fn((blob: Blob) => {
    dernierBlob = blob;
    return "blob:fiche";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    if (dernierBlob) telecharges.push({ nom: this.download, blob: dernierBlob });
  });
  fetchEspion = vi.fn();
  vi.stubGlobal("fetch", fetchEspion);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function afficher(aVerifier: string[] = []) {
  render(<FicheEditable fiche={fiche} aVerifier={aVerifier} modele="claude-haiku-5-5" source="Chloé Démo (CV fictif)" />);
  return userEvent.setup();
}

const boutonTelecharger = () => screen.getByRole("button", { name: "Télécharger la fiche (JSON)" });
const boutonValider = () => screen.getByRole("button", { name: "Valider la fiche" });

async function lireTelechargement() {
  expect(telecharges).toHaveLength(1);
  return { nom: telecharges[0]!.nom, contenu: JSON.parse(await telecharges[0]!.blob.text()) };
}

describe("FicheEditable", () => {
  it("pré-remplit chaque champ, avec une étiquette", () => {
    afficher();
    expect(screen.getByLabelText("Nom complet")).toHaveProperty("value", "Chloé Démo");
    expect(screen.getByLabelText("Ville")).toHaveProperty("value", "Toulouse");
    expect(screen.getByLabelText("Compétence 1")).toHaveProperty("value", "React Native");
    expect(screen.getByLabelText("Poste (expérience 1)")).toHaveProperty("value", "Développeuse mobile");
  });

  it("empêche tout téléchargement avant la validation", async () => {
    const user = afficher();
    expect(boutonTelecharger()).toHaveProperty("disabled", true);
    await user.click(boutonTelecharger());
    expect(telecharges).toHaveLength(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("affiche la boîte de dialogue s'il reste des valeurs à vérifier", async () => {
    const user = afficher(["identite.ville", "contact.email"]);
    await user.click(boutonValider());
    const dialogue = screen.getByRole("dialog", { name: "2 valeurs encore à vérifier" });
    expect(within(dialogue).getByRole("button", { name: "Revenir vérifier" })).toBe(document.activeElement);
    expect(boutonTelecharger()).toHaveProperty("disabled", true);

    await user.click(within(dialogue).getByRole("button", { name: "Valider quand même" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boutonTelecharger()).toHaveProperty("disabled", false);

    // « Valider quand même » garde la trace des valeurs non vérifiées dans le fichier.
    await user.click(boutonTelecharger());
    const { contenu } = await lireTelechargement();
    expect(contenu.nonVerifiees).toEqual(["identite.ville", "contact.email"]);
  });

  it("« Revenir vérifier » ferme la boîte et place le focus sur le premier champ à vérifier", async () => {
    const user = afficher(["contact.email"]);
    await user.click(boutonValider());
    await user.click(screen.getByRole("button", { name: "Revenir vérifier" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("E-mail"));
    expect(boutonTelecharger()).toHaveProperty("disabled", true);
  });

  it("Échap ferme la boîte comme « Revenir vérifier »", async () => {
    const user = afficher(["contact.email"]);
    await user.click(boutonValider());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("E-mail"));
  });

  it("« Confirmer » retire le badge ; plus de dialogue ensuite", async () => {
    const user = afficher(["identite.ville"]);
    expect(screen.getAllByText("à vérifier")).toHaveLength(2); // badge du champ + légende
    await user.click(screen.getByRole("button", { name: "Confirmer : Ville" }));
    expect(screen.getAllByText("à vérifier")).toHaveLength(1); // légende seule
    expect(document.activeElement).toBe(screen.getByLabelText("Ville"));
    await user.click(boutonValider());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boutonTelecharger()).toHaveProperty("disabled", false);
  });

  it("affiche l'erreur sous le champ, en français, et y place le focus", async () => {
    const user = afficher();
    const email = screen.getByLabelText("E-mail");
    await user.clear(email);
    await user.type(email, "pas-un-email");
    await user.click(boutonValider());
    expect(screen.getByText(/Adresse e-mail invalide/)).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(email);
    expect(boutonTelecharger()).toHaveProperty("disabled", true);
  });

  it("valide et télécharge sans aucun appel réseau ; le fichier respecte FicheValideeSchema", async () => {
    const user = afficher(["identite.ville"]);
    await user.click(screen.getByRole("button", { name: "Confirmer : Ville" }));
    const titre = screen.getByLabelText("Titre");
    await user.clear(titre);
    await user.type(titre, "Développeuse mobile React Native");
    await user.click(boutonValider());
    await user.click(boutonTelecharger());

    expect(fetchEspion).not.toHaveBeenCalled();
    const { nom, contenu } = await lireTelechargement();
    expect(nom).toMatch(/^fiche-chloe-demo-\d{4}-\d{2}-\d{2}\.json$/);
    expect(FicheValideeSchema.safeParse(contenu).success).toBe(true);
    expect(contenu).toMatchObject({ versionSchema: 1, champsCorriges: 1, nonVerifiees: [], modele: "claude-haiku-5-5" });
    expect(contenu.fiche.identite.titre).toBe("Développeuse mobile React Native");
  });

  it("un champ vidé devient null dans le fichier", async () => {
    const user = afficher();
    await user.clear(screen.getByLabelText("Téléphone"));
    expect(screen.getAllByText("non trouvé").length).toBeGreaterThan(0);
    await user.click(boutonValider());
    await user.click(boutonTelecharger());
    const { contenu } = await lireTelechargement();
    expect(contenu.fiche.contact.telephone).toBeNull();
    expect(contenu.champsCorriges).toBe(1);
  });

  it("ajoute et supprime des éléments de liste, comptés comme corrections", async () => {
    const user = afficher();
    await user.click(screen.getByRole("button", { name: "Supprimer : compétence 1" }));
    await user.click(screen.getByRole("button", { name: "Ajouter une compétence" }));
    const nouvelle = screen.getByLabelText("Compétence 5");
    expect(document.activeElement).toBe(nouvelle);
    await user.type(nouvelle, "Kotlin");
    await user.click(boutonValider());
    await user.click(boutonTelecharger());
    const { contenu } = await lireTelechargement();
    expect(contenu.fiche.competences).toEqual(["Expo", "TypeScript", "Firebase", "Git", "Kotlin"]);
    expect(contenu.champsCorriges).toBe(2);
  });

  it("une modification après validation rend le téléchargement de nouveau impossible", async () => {
    const user = afficher();
    await user.click(boutonValider());
    expect(boutonTelecharger()).toHaveProperty("disabled", false);
    await user.type(screen.getByLabelText("Pays"), "!");
    expect(boutonTelecharger()).toHaveProperty("disabled", true);
  });
});
