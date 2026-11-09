// @vitest-environment jsdom
/**
 * Parcours en trois étapes (components/ParcoursCV.tsx) : défilement et focus après chaque étape,
 * replis du choix du CV et de la fiche, sections repliables, mouvement réduit.
 * scrollIntoView et matchMedia sont simulés (jsdom ne les fournit pas) ; aucun appel réseau réel.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FicheEditable from "@/components/FicheEditable";
import ParcoursCV from "@/components/ParcoursCV";

const RACINE = join(import.meta.dirname, "..");
const referenceLea = JSON.parse(readFileSync(join(RACINE, "public", "samples", "cv-01-lea-fictivia.json"), "utf8"));
const ficheAttendueSam = JSON.parse(readFileSync(join(RACINE, "samples", "cv-02-sam-placeholder.json"), "utf8"));
const EXEMPLE = ["Pratique de React", "Expérience de Kotlin"];
const reponseComparaison = {
  resultats: [
    { critere: "Pratique de React", statut: "present", justification: "React", justificationRejetee: false, justificationRejeteeTexte: null },
    { critere: "Expérience de Kotlin", statut: "non_trouve", justification: null, justificationRejetee: false, justificationRejeteeTexte: null },
  ],
};

let defilements: { element: Element; options: ScrollIntoViewOptions | undefined }[];
let mouvementReduit: boolean;
let fetchEspion: ReturnType<typeof vi.fn>;

beforeEach(() => {
  defilements = [];
  mouvementReduit = false;
  Element.prototype.scrollIntoView = vi.fn(function (this: Element, options?: boolean | ScrollIntoViewOptions) {
    defilements.push({ element: this, options: typeof options === "object" ? options : undefined });
  });
  window.matchMedia = vi.fn((requete: string) => ({
    matches: requete.includes("prefers-reduced-motion") && mouvementReduit,
    media: requete,
  })) as unknown as typeof window.matchMedia;
  fetchEspion = vi.fn(async (url: string) => {
    if (url.startsWith("/samples/")) return Response.json(referenceLea);
    if (url === "/api/compare") return Response.json(reponseComparaison);
    if (url === "/api/extract") {
      return Response.json({ fiche: ficheAttendueSam, aVerifier: [], modele: "claude-haiku-5-5", dureeMs: 4000 });
    }
    throw new Error(`appel inattendu : ${url}`);
  });
  vi.stubGlobal("fetch", fetchEspion);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function afficherParcours() {
  render(<ParcoursCV disponibles={["cv-01-lea-fictivia"]} criteresExemple={EXEMPLE} />);
  return userEvent.setup();
}

/** L'étape en cours (aria-current="step") et les étapes cochées. */
function etapes() {
  const liste = screen.getByRole("list", { name: "Étapes du parcours" });
  const items = within(liste).getAllByRole("listitem");
  return {
    enCours: items.find((li) => li.getAttribute("aria-current") === "step")?.textContent ?? null,
    terminees: items.filter((li) => li.textContent?.includes("Terminé")).map((li) => li.textContent),
  };
}

/** Dernier élément amené à l'écran, et avec quel défilement. */
const dernierDefilement = () => defilements[defilements.length - 1];

describe("parcours en trois étapes", () => {
  it("au départ : étape 1 en cours, aucune cochée", () => {
    afficherParcours();
    expect(etapes()).toEqual({ enCours: "1.Choisir un CV", terminees: [] });
  });

  it("CV fictif chargé → défilement vers « Fiche à valider », focus sur le titre, choix replié en une ligne", async () => {
    const user = afficherParcours();
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    const titre = await screen.findByRole("heading", { name: /Fiche à valider : Léa Fictivia/ });

    expect(document.activeElement).toBe(titre);
    expect(titre.getAttribute("tabindex")).toBe("-1");
    expect(dernierDefilement()).toEqual({ element: titre, options: { behavior: "smooth", block: "start" } });
    expect(etapes()).toEqual({ enCours: "2.Vérifier la fiche", terminees: ["✓Terminé : Choisir un CV"] });

    // Le choix du CV est replié : une seule ligne, plus de zone de dépôt.
    expect(screen.getByText("Léa Fictivia (CV fictif)").closest("p")?.textContent).toBe("CV : Léa Fictivia (CV fictif)·Changer de CV");
    expect(screen.queryByRole("button", { name: "Choisir un PDF" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Changer de CV" }));
    expect(screen.getByRole("button", { name: "Choisir un PDF" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Fiche à valider/ })).toBeTruthy(); // la fiche reste là
  });

  it("PDF déposé → « Lecture du CV… », puis défilement et focus sur la fiche", async () => {
    let terminer: (r: Response) => void = () => {};
    fetchEspion.mockImplementationOnce(() => new Promise<Response>((resoudre) => (terminer = resoudre)));
    const user = afficherParcours();
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "cv-sam.pdf", { type: "application/pdf" });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, pdf);

    const bouton = screen.getByRole("button", { name: "Lecture du CV…" });
    expect(bouton).toHaveProperty("disabled", true);
    terminer(Response.json({ fiche: ficheAttendueSam, aVerifier: [], modele: "claude-haiku-5-5", dureeMs: 4000 }));

    const titre = await screen.findByRole("heading", { name: /Fiche à valider : cv-sam\.pdf/ });
    expect(document.activeElement).toBe(titre);
    expect(dernierDefilement()?.element).toBe(titre);
  });

  it("« Valider la fiche » → fiche repliée en résumé, défilement et focus sur la zone de comparaison", async () => {
    const user = afficherParcours();
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    await screen.findByRole("heading", { name: /Fiche à valider/ });
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));

    const titreComparaison = screen.getByRole("heading", { name: "Comparer la fiche validée à une offre" });
    expect(document.activeElement).toBe(titreComparaison);
    expect(dernierDefilement()?.element).toBe(titreComparaison);
    expect(etapes().enCours).toBe("3.Comparer à l'offre");
    expect(etapes().terminees).toHaveLength(2);

    // Résumé : nom, titre, champs corrigés, valeurs non vérifiées ; le formulaire n'est plus affiché.
    const resume = screen.getByRole("region", { name: "Résumé de la fiche validée" });
    expect(resume.textContent).toContain("Léa Fictivia");
    expect(resume.textContent).toContain("Développeuse full-stack TypeScript");
    expect(resume.textContent).toMatch(/Champs corrigés\s*0/);
    expect(resume.textContent).toMatch(/Valeurs non vérifiées\s*0/);
    expect(screen.queryByLabelText("Nom complet")).toBeNull();
  });

  it("« Modifier la fiche » rouvre le formulaire, annule la validation et retire la comparaison", async () => {
    const user = afficherParcours();
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    await screen.findByRole("heading", { name: /Fiche à valider/ });
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    await user.click(screen.getByRole("button", { name: "Modifier la fiche" }));

    const titre = screen.getByRole("heading", { name: /Fiche à valider/ });
    expect(document.activeElement).toBe(titre);
    expect(screen.getByLabelText("Nom complet")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Comparer la fiche validée à une offre" })).toBeNull();
    expect(screen.getByRole("button", { name: "Télécharger la fiche (JSON)" })).toHaveProperty("disabled", true);
    expect(etapes().enCours).toBe("2.Vérifier la fiche");
  });

  it("« Comparer » → « Comparaison en cours… », puis défilement et focus sur les résultats ; étape 3 cochée", async () => {
    const user = afficherParcours();
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    await screen.findByRole("heading", { name: /Fiche à valider/ });
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    await user.click(screen.getByRole("button", { name: "Utiliser les critères d'exemple" }));

    let terminer: (r: Response) => void = () => {};
    fetchEspion.mockImplementationOnce(() => new Promise<Response>((resoudre) => (terminer = resoudre)));
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    expect(screen.getByRole("button", { name: "Comparaison en cours…" })).toHaveProperty("disabled", true);
    terminer(Response.json(reponseComparaison));

    const titreResultats = await screen.findByRole("heading", { name: "Résultats, critère par critère" });
    expect(document.activeElement).toBe(titreResultats);
    expect(dernierDefilement()?.element).toBe(titreResultats);
    // Le parcours est prévenu après l'affichage des résultats (rendu suivant).
    await waitFor(() => expect(etapes().terminees).toHaveLength(3));
  });

  it("prefers-reduced-motion : aucun défilement animé (behavior « auto »)", async () => {
    mouvementReduit = true;
    const user = afficherParcours();
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    await screen.findByRole("heading", { name: /Fiche à valider/ });
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    expect(defilements.length).toBeGreaterThanOrEqual(2);
    for (const d of defilements) expect(d.options?.behavior).toBe("auto");
  });
});

describe("sections repliables de la fiche", () => {
  const section = (titre: string) => screen.getByText(titre, { selector: "summary" }).closest("details") as HTMLDetailsElement;

  it("sans valeur « à vérifier » : compétences, expériences et formations repliées", () => {
    render(<FicheEditable fiche={referenceLea.fiche} aVerifier={[]} modele="m" source="Léa" />);
    for (const titre of ["Compétences", "Expériences", "Formations"]) expect(section(titre).open).toBe(false);
  });

  it("une valeur « à vérifier » garde sa section ouverte ; les autres restent repliées", () => {
    render(<FicheEditable fiche={referenceLea.fiche} aVerifier={["competences.2"]} modele="m" source="Léa" />);
    expect(section("Compétences").open).toBe(true);
    expect(section("Expériences").open).toBe(false);
  });

  it("une erreur de validation dans une section repliée l'ouvre et y place le focus", async () => {
    const user = userEvent.setup();
    render(<FicheEditable fiche={referenceLea.fiche} aVerifier={[]} modele="m" source="Léa" />);
    expect(section("Compétences").open).toBe(false);
    await user.clear(screen.getByLabelText("Compétence 1"));
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    expect(section("Compétences").open).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText("Compétence 1"));
  });
});
