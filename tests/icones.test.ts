/**
 * Icônes du site (app/favicon.ico, app/icon.svg) : propres au projet, plus celle du modèle create-next-app.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(import.meta.dirname, "..", "app");

/** Empreinte MD5 du favicon fourni par create-next-app (le logo de Next.js), présent depuis le commit initial. */
const FAVICON_MODELE = "2be26fb5639bc7a24d9c816567b0de5f";

describe("icônes", () => {
  it("le favicon n'est plus celui du modèle create-next-app", () => {
    const empreinte = createHash("md5").update(readFileSync(join(APP, "favicon.ico"))).digest("hex");
    expect(empreinte).not.toBe(FAVICON_MODELE);
  });

  it("le favicon contient les tailles 16, 32 et 48 px", () => {
    const ico = readFileSync(join(APP, "favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1); // type : icône
    const nombre = ico.readUInt16LE(4);
    // Dans le répertoire ICO, une largeur de 0 vaut 256 ; ici, seules 16, 32 et 48 sont attendues.
    const largeurs = Array.from({ length: nombre }, (_, i) => ico[6 + i * 16]).sort((a, b) => a! - b!);
    expect(largeurs).toEqual([16, 32, 48]);
  });

  it("l'icône SVG est autonome : aucune ressource extérieure ni script", () => {
    const svg = readFileSync(join(APP, "icon.svg"), "utf8");
    expect(svg).toMatch(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).not.toMatch(/<script|href=|url\(/);
  });
});
