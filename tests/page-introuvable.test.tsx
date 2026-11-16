// @vitest-environment jsdom
/**
 * Page 404 (app/not-found.tsx) : en français, avec un retour à l'accueil.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageIntrouvable, { metadata } from "@/app/not-found";

afterEach(cleanup);

describe("page 404", () => {
  it("parle français et ramène à l'accueil", () => {
    render(<PageIntrouvable />);
    expect(screen.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revenir à l'accueil" }).getAttribute("href")).toBe("/");
    expect(document.body.textContent).not.toMatch(/could not be found/);
  });

  it("donne son titre d'onglet par les métadonnées, sans balise <title> dans la page", () => {
    // Un <title> écrit dans le composant s'ajoutait à celui du layout (« CV Reader ») : plusieurs
    // titres dans la page. L'export metadata est fusionné par Next.js avec celui du layout : un seul titre.
    expect(metadata.title).toBe("Page introuvable · CV Reader");
    render(<PageIntrouvable />);
    expect(document.querySelectorAll("title")).toHaveLength(0);
  });
});
