// @vitest-environment jsdom
/**
 * Page 404 (app/not-found.tsx) : en français, avec un retour à l'accueil.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageIntrouvable from "@/app/not-found";

afterEach(cleanup);

describe("page 404", () => {
  it("parle français et ramène à l'accueil", () => {
    render(<PageIntrouvable />);
    expect(screen.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revenir à l'accueil" }).getAttribute("href")).toBe("/");
    expect(document.body.textContent).not.toMatch(/could not be found/);
  });

  it("donne un titre d'onglet en français", () => {
    render(<PageIntrouvable />);
    expect(document.querySelector("title")?.textContent).toBe("Page introuvable · CV Reader");
  });
});
