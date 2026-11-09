// @vitest-environment jsdom
/**
 * Écran de comparaison (components/ComparaisonOffre.tsx), et son accès depuis le formulaire.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComparaisonOffre from "@/components/ComparaisonOffre";
import FicheEditable from "@/components/FicheEditable";
import type { FicheCV } from "@/lib/schemas";

const fiche: FicheCV = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "samples", "cv-01-lea-fictivia.json"), "utf8"),
);
const EXEMPLE = ["Pratique de React", "Expérience de Kotlin", "Usage quotidien d'un assistant de code IA"];

/** Réponse simulée de /api/compare (sans chiffre, pour vérifier qu'aucun n'est ajouté par l'écran). */
const reponseApi = {
  resultats: [
    { critere: "Pratique de React", statut: "present", justification: "React", justificationRejetee: false, justificationRejeteeTexte: null },
    { critere: "Expérience de Kotlin", statut: "non_trouve", justification: null, justificationRejetee: true, justificationRejeteeTexte: "Kotlin pour Android" },
    { critere: "Usage quotidien d'un assistant de code IA", statut: "present", justification: "Usage quotidien d'un assistant de code IA", justificationRejetee: false, justificationRejeteeTexte: null },
  ],
};

let fetchEspion: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchEspion = vi.fn(async () => Response.json(reponseApi));
  vi.stubGlobal("fetch", fetchEspion);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ComparaisonOffre", () => {
  it("charge les critères d'exemple, compare, et affiche « présent » ou « non trouvé dans la fiche » par critère", async () => {
    const user = userEvent.setup();
    render(<ComparaisonOffre fiche={fiche} criteresExemple={EXEMPLE} />);
    expect(screen.getByText("Aide à la lecture. La décision reste humaine.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Utiliser les critères d'exemple" }));
    expect(screen.getByLabelText("Critères de l'offre")).toHaveProperty("value", EXEMPLE.join("\n"));

    await user.click(screen.getByRole("button", { name: "Comparer" }));
    const liste = await screen.findByRole("list", { name: "Résultats de la comparaison" });
    expect(liste.querySelectorAll("li")).toHaveLength(3);
    expect(liste.textContent).toContain("présent");
    expect(liste.textContent).toContain("« React »");
    // Le libellé dit « dans la fiche » : un « non trouvé » n'est pas une preuve d'absence.
    const badges = [...liste.querySelectorAll("li span span")].map((s) => s.textContent?.trim());
    expect(badges).toContain("non trouvé dans la fiche");
    expect(badges).not.toContain("non trouvé");
    expect(liste.textContent).toContain("justification du modèle introuvable dans la fiche");
    // La justification rejetée reste visible, barrée, sous la mention.
    const barree = liste.querySelector("del");
    expect(barree?.textContent).toBe("« Kotlin pour Android »");
    expect(barree?.closest("li")?.textContent).toContain("Expérience de Kotlin");
    expect(liste.querySelectorAll("del")).toHaveLength(1);

    // La requête part avec la fiche validée et les critères, un par ligne.
    const [url, options] = fetchEspion.mock.calls[0]!;
    expect(url).toBe("/api/compare");
    expect(JSON.parse(options.body)).toEqual({ fiche, criteres: EXEMPLE });
  });

  it("n'affiche aucun chiffre de synthèse : ni score, ni pourcentage, ni total", async () => {
    const user = userEvent.setup();
    render(<ComparaisonOffre fiche={fiche} criteresExemple={EXEMPLE} />);
    await user.click(screen.getByRole("button", { name: "Utiliser les critères d'exemple" }));
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    const liste = await screen.findByRole("list", { name: "Résultats de la comparaison" });
    // Ni les critères ni les justifications simulés ne contiennent de chiffre : l'écran n'en ajoute aucun.
    expect(liste.textContent).not.toMatch(/\d/);
    const section = liste.closest("section")!;
    expect(section.textContent).not.toMatch(/%|score|\btotal\b|sur \d/i);
  });

  it("refuse plus de 20 critères dans le navigateur, sans appel réseau", async () => {
    const user = userEvent.setup();
    render(<ComparaisonOffre fiche={fiche} criteresExemple={EXEMPLE} />);
    const zone = screen.getByLabelText("Critères de l'offre");
    await user.click(zone);
    await user.paste(Array.from({ length: 21 }, (_, i) => `Critère ${i + 1}`).join("\n"));
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    expect(screen.getByRole("alert").textContent).toMatch(/au plus 20 critères/);
    expect(fetchEspion).not.toHaveBeenCalled();
  });
});

describe("accès à la comparaison", () => {
  it("n'est possible qu'après la validation de la fiche", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    const user = userEvent.setup();
    render(<FicheEditable fiche={fiche} aVerifier={[]} modele="modele-test" source="Léa" criteresExemple={EXEMPLE} />);
    expect(screen.queryByLabelText("Critères de l'offre")).toBeNull();
    expect(screen.getByText(/devient possible après la validation de la fiche/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    expect(screen.getByLabelText("Critères de l'offre")).toBeTruthy();

    // Une modification après validation retire la comparaison jusqu'à la prochaine validation.
    await user.type(screen.getByLabelText("Pays"), "!");
    expect(screen.queryByLabelText("Critères de l'offre")).toBeNull();
  });
});
