// @vitest-environment jsdom
/**
 * Texte de la boîte de dialogue « à vérifier » (components/DialogueAVerifier.tsx) : accords au singulier et au pluriel.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DialogueAVerifier from "@/components/DialogueAVerifier";

afterEach(cleanup);

const rien = () => {};

describe("DialogueAVerifier", () => {
  it("au singulier : « la vérifier », jamais « les »", () => {
    render(<DialogueAVerifier nombre={1} surRevenir={rien} surValider={rien} />);
    const texte = screen.getByRole("dialog").textContent ?? "";
    expect(texte).toContain("1 valeur encore à vérifier");
    expect(texte).toContain("Vous pouvez revenir la vérifier");
    expect(texte).not.toContain("les vérifier");
  });

  it("au pluriel : « les vérifier »", () => {
    render(<DialogueAVerifier nombre={3} surRevenir={rien} surValider={rien} />);
    const texte = screen.getByRole("dialog").textContent ?? "";
    expect(texte).toContain("3 valeurs encore à vérifier");
    expect(texte).toContain("Vous pouvez revenir les vérifier");
  });
});
