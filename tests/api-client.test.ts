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

  it("envoie le fichier en multipart, dans le champ « file »", async () => {
    const envoi = fetchQuiRepond(
      Response.json({ code: "EXTRACTION_PAS_ENCORE_DISPONIBLE", message: "Bientôt." }, { status: 501 }),
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
