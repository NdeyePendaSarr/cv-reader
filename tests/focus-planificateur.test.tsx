// @vitest-environment jsdom
/**
 * Le focus suit l'affichage dans le même rendu, même quand le planificateur de React est en retard.
 *
 * Cause de l'ancien test instable (tests/parcours.test.tsx, « Comparer ») : le focus était posé
 * dans un useEffect. Après une réponse réseau, React exécute ces effets dans une tâche à part,
 * planifiée sous Node par setImmediate ; findByRole, lui, rend la main après un setTimeout(0).
 * Sous Node, l'ordre entre ces deux minuteries n'est pas garanti : selon la charge de la machine,
 * le test vérifiait le focus avant que l'effet ait tourné.
 *
 * Ici, setImmediate est retardé avant le chargement de React : l'ordre défavorable devient certain.
 * Le focus doit donc être posé pendant le rendu lui-même (useLayoutEffect), pas après.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Avant tout import de React : le planificateur lit setImmediate une seule fois, à son chargement.
vi.hoisted(() => {
  const g = globalThis as unknown as { setImmediate: (rappel: (...a: unknown[]) => void, ...a: unknown[]) => unknown };
  g.setImmediate = (rappel, ...args) => setTimeout(() => rappel(...args), 30);
});

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: userEvent } = await import("@testing-library/user-event");
const { default: ParcoursCV } = await import("@/components/ParcoursCV");

const RACINE = join(import.meta.dirname, "..");
const referenceLea = JSON.parse(readFileSync(join(RACINE, "public", "samples", "cv-01-lea-fictivia.json"), "utf8"));
const reponseComparaison = {
  resultats: [
    { critere: "Pratique de React", statut: "present", justification: "React", justificationRejetee: false, justificationRejeteeTexte: null },
  ],
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/samples/")) return Response.json(referenceLea);
      if (url === "/api/compare") return Response.json(reponseComparaison);
      throw new Error(`appel inattendu : ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("focus posé dans le même rendu que la section affichée (planificateur de React en retard)", () => {
  it("fiche chargée après une requête : focus sur « Fiche à valider » dès son affichage", async () => {
    const user = userEvent.setup();
    render(<ParcoursCV disponibles={["cv-01-lea-fictivia"]} criteresExemple={["Pratique de React"]} />);
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    const titre = await screen.findByRole("heading", { name: /Fiche à valider/ });
    expect(document.activeElement).toBe(titre);
  });

  it("résultats reçus après une requête : focus sur « Résultats, critère par critère » dès leur affichage", async () => {
    const user = userEvent.setup();
    render(<ParcoursCV disponibles={["cv-01-lea-fictivia"]} criteresExemple={["Pratique de React"]} />);
    await user.click(screen.getByRole("button", { name: /Léa Fictivia/ }));
    await screen.findByRole("heading", { name: /Fiche à valider/ });
    await user.click(screen.getByRole("button", { name: "Valider la fiche" }));
    await user.click(screen.getByRole("button", { name: "Utiliser les critères d'exemple" }));
    await user.click(screen.getByRole("button", { name: "Comparer" }));
    const titre = await screen.findByRole("heading", { name: "Résultats, critère par critère" });
    expect(document.activeElement).toBe(titre);
  });
});
