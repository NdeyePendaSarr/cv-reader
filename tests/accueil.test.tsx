// @vitest-environment jsdom
/**
 * Page d'accueil (app/page.tsx) : texte du sur-titre et repères de page.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Accueil from "@/app/page";

afterEach(cleanup);

describe("page d'accueil", () => {
  it("ne se présente plus comme « en construction »", () => {
    render(<Accueil />);
    expect(document.body.textContent).not.toMatch(/en construction/i);
  });

  it("place le bandeau « Démo » dans le repère d'en-tête de la page (banner)", () => {
    render(<Accueil />);
    const entete = screen.getByRole("banner");
    expect(within(entete).getByRole("note").textContent).toMatch(/Démo : n'envoyez pas de vrai CV/);
    // Le titre de la page reste dans le contenu principal.
    expect(within(screen.getByRole("main")).getByRole("heading", { level: 1, name: "CV Reader" })).toBeTruthy();
  });
});
