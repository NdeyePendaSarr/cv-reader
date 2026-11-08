import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { envoyerCV } from "@/lib/api-client";
import { TAILLE_MAX_OCTETS } from "@/lib/limites";

/** Petit fichier qui se présente comme un PDF. */
function fichierPdf(taille = 100, nom = "cv.pdf"): File {
  const octets = new Uint8Array(taille);
  octets.set(new TextEncoder().encode("%PDF-1.7"));
  return new File([octets], nom, { type: "application/pdf" });
}

/** Remplace fetch par une fonction qui renvoie toujours `reponse`. */
function fetchQuiRepond(reponse: Response) {
  return vi.fn<typeof fetch>(async () => reponse);
}

describe("envoyerCV", () => {
  it("donne un message clair quand Vercel répond 413 sans JSON", async () => {
    const envoi = fetchQuiRepond(
      new Response("<html><body>413 Request Entity Too Large</body></html>", {
        status: 413,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.code).toBe("FICHIER_TROP_LOURD");
      expect(resultat.message).toMatch(/trop lourd/);
      expect(resultat.message).toMatch(/4 Mo/);
      expect(resultat.message).not.toMatch(/html/i);
    }
  });

  it("donne un message clair quand le corps 413 n'a aucun Content-Type", async () => {
    const envoi = fetchQuiRepond(new Response("Request Entity Too Large", { status: 413 }));
    // Sans Content-Type explicite, un corps texte est annoncé « text/plain ».
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD" });
  });

  it("refuse un fichier de plus de 4 Mo sans rien envoyer", async () => {
    const envoi = vi.fn<typeof fetch>();
    const resultat = await envoyerCV(fichierPdf(TAILLE_MAX_OCTETS + 1), envoi);
    expect(resultat).toMatchObject({ ok: false, code: "FICHIER_TROP_LOURD" });
    expect(envoi).not.toHaveBeenCalled();
  });

  it("refuse un fichier qui n'est pas un PDF sans rien envoyer", async () => {
    const envoi = vi.fn<typeof fetch>();
    const image = new File(["abc"], "photo.png", { type: "image/png" });
    const resultat = await envoyerCV(image, envoi);
    expect(resultat).toMatchObject({ ok: false, code: "FICHIER_INVALIDE" });
    expect(envoi).not.toHaveBeenCalled();
  });

  it("transmet le message d'une erreur JSON de l'API", async () => {
    const envoi = fetchQuiRepond(
      Response.json({ code: "TROP_DE_PAGES", message: "Ce PDF fait 6 pages." }, { status: 400 }),
    );
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toEqual({ ok: false, code: "TROP_DE_PAGES", message: "Ce PDF fait 6 pages." });
  });

  it("renvoie la fiche d'une réponse 200 validée par Zod", async () => {
    const fiche = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "samples", "cv-03-hugo-exemplaire.json"), "utf8"),
    );
    const corps = { fiche, aVerifier: ["identite.ville"], modele: "modele-test", dureeMs: 4200 };
    const resultat = await envoyerCV(fichierPdf(), fetchQuiRepond(Response.json(corps)));
    expect(resultat).toEqual({ ok: true, donnees: corps });
  });

  it("refuse d'afficher une réponse 200 dont la fiche ne respecte pas le schéma", async () => {
    const corps = { fiche: { identite: {} }, aVerifier: [], modele: "modele-test", dureeMs: 1 };
    const resultat = await envoyerCV(fichierPdf(), fetchQuiRepond(Response.json(corps)));
    expect(resultat).toMatchObject({ ok: false, code: "REPONSE_INATTENDUE" });
  });

  it("429 : transmet le message du serveur et le délai lu dans Retry-After", async () => {
    const envoi = fetchQuiRepond(
      Response.json(
        { code: "QUOTA_IP", message: "Limite atteinte. Réessayez dans 10 minutes." },
        { status: 429, headers: { "retry-after": "600" } },
      ),
    );
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toEqual({
      ok: false,
      code: "QUOTA_IP",
      message: "Limite atteinte. Réessayez dans 10 minutes.",
      attenteSecondes: 600,
    });
  });

  it("429 sans JSON : message clair avec le délai d'attente", async () => {
    const envoi = fetchQuiRepond(new Response("Too Many Requests", { status: 429, headers: { "retry-after": "120" } }));
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toMatchObject({ ok: false, code: "QUOTA_IP", attenteSecondes: 120 });
    if (!resultat.ok) expect(resultat.message).toMatch(/2 minutes/);
  });

  it("422 et 502 : messages clairs, même sans JSON", async () => {
    const r422 = await envoyerCV(fichierPdf(), fetchQuiRepond(new Response("x", { status: 422 })));
    expect(r422).toMatchObject({ ok: false, code: "EXTRACTION_IMPOSSIBLE" });
    if (!r422.ok) expect(r422.message).toMatch(/n'ont pas pu être extraites/);
    const r502 = await envoyerCV(fichierPdf(), fetchQuiRepond(new Response("Bad Gateway", { status: 502 })));
    expect(r502).toMatchObject({ ok: false, code: "MODELE_INDISPONIBLE" });
    if (!r502.ok) expect(r502.message).toMatch(/ne répond pas/);
  });

  it("envoie le fichier en multipart, dans le champ « file »", async () => {
    const envoi = fetchQuiRepond(
      Response.json({ code: "EXTRACTION_IMPOSSIBLE", message: "Extraction impossible." }, { status: 422 }),
    );
    await envoyerCV(fichierPdf(100, "mon-cv.pdf"), envoi);
    const [url, options] = envoi.mock.calls[0]!;
    expect(url).toBe("/api/extract");
    expect(options?.method).toBe("POST");
    const corps = options?.body as FormData;
    expect((corps.get("file") as File).name).toBe("mon-cv.pdf");
  });

  it("donne un message clair en cas de panne réseau", async () => {
    const envoi = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toMatchObject({ ok: false, code: "RESEAU" });
    if (!resultat.ok) expect(resultat.message).toMatch(/connexion/);
  });

  it("donne un message clair si le JSON annoncé est illisible", async () => {
    const envoi = fetchQuiRepond(
      new Response("{pas du json", { status: 500, headers: { "content-type": "application/json" } }),
    );
    const resultat = await envoyerCV(fichierPdf(), envoi);
    expect(resultat).toMatchObject({ ok: false, code: "REPONSE_INATTENDUE" });
  });
});
