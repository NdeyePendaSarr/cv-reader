/**
 * lib/claude.ts avec un client simulé : aucun appel réel à l'API.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { CONSIGNE_SYSTEME, ErreurExtraction, extraire, NOM_OUTIL, type ClientMessages } from "@/lib/claude";
import { schemaPourModele } from "@/lib/schema-outil";

const PDF = new TextEncoder().encode("%PDF-1.7 contenu simulé");

/** Une fiche valide (réponse attendue d'un CV fictif). */
function ficheValide() {
  return JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "cv-06-nina-inventee.json"), "utf8"));
}

/** Réponse simulée du modèle. */
function reponse(contenu: unknown[], jetons = { input_tokens: 1000, output_tokens: 200 }): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "modele-test",
    content: contenu,
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: jetons,
  } as unknown as Anthropic.Message;
}

const appelOutil = (input: unknown, id = "toolu_1") => ({ type: "tool_use", id, name: NOM_OUTIL, input });
const texteSeul = { type: "text", text: "Voici la fiche : …" };

/** Client simulé qui renvoie les réponses dans l'ordre. */
function clientSimule(...reponses: (Anthropic.Message | Error)[]) {
  const create = vi.fn();
  for (const r of reponses) {
    if (r instanceof Error) create.mockRejectedValueOnce(r);
    else create.mockResolvedValueOnce(r);
  }
  return { client: { messages: { create } } as unknown as ClientMessages, create };
}

describe("extraire", () => {
  it("renvoie la fiche validée, les jetons et la durée, sans nouvel essai", async () => {
    const { client, create } = clientSimule(reponse([appelOutil(ficheValide())]));
    const r = await extraire(PDF, "modele-test", client);
    expect(r.fiche).toEqual(ficheValide());
    expect(r).toMatchObject({ modele: "modele-test", jetonsEntree: 1000, jetonsSortie: 200, nouvelEssai: false, sansAppelOutil: 0, sortiesInvalides: 0 });
    expect(r.dureeMs).toBeGreaterThanOrEqual(0);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("envoie le PDF en bloc document base64, la consigne mot pour mot et l'outil strict en tool_choice auto", async () => {
    const { client, create } = clientSimule(reponse([appelOutil(ficheValide())]));
    await extraire(PDF, "modele-test", client);
    const params = create.mock.calls[0]![0];
    expect(params.system).toBe(CONSIGNE_SYSTEME);
    expect(params.tool_choice).toEqual({ type: "auto" });
    expect(params.tools).toHaveLength(1);
    expect(params.tools[0]).toMatchObject({ name: NOM_OUTIL, input_schema: schemaPourModele() });
    // Pas de mode strict : il limite le schéma à 16 champs nullables, la fiche en a 20.
    expect(params.tools[0]).not.toHaveProperty("strict");
    const document = params.messages[0].content[0];
    expect(document).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: Buffer.from(PDF).toString("base64") },
    });
  });

  it("langueDuCV : la description de l'outil la définit comme la langue du texte ; CV en anglais (Sam Placeholder) → « en »", async () => {
    const sam = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "cv-02-sam-placeholder.json"), "utf8"));
    expect(sam.langueDuCV).toBe("en");
    const { client, create } = clientSimule(reponse([appelOutil(sam)]));
    const r = await extraire(PDF, "modele-test", client);
    const description = create.mock.calls[0]![0].tools[0].description as string;
    expect(description).toMatch(/langueDuCV est la langue dans laquelle le texte du CV est rédigé/);
    expect(description).toMatch(/jamais la nationalité, le pays ni la langue maternelle/);
    // La consigne système, elle, reste mot pour mot celle de la spec.
    expect(create.mock.calls[0]![0].system).toBe(CONSIGNE_SYSTEME);
    expect(r.fiche.langueDuCV).toBe("en");
  });

  it("n'envoie ni temperature, ni top_p, ni top_k, ni réglage de réflexion ou d'effort", async () => {
    const { client, create } = clientSimule(reponse([appelOutil(ficheValide())]));
    await extraire(PDF, "modele-test", client);
    const params = create.mock.calls[0]![0];
    for (const cle of ["temperature", "top_p", "top_k", "thinking", "output_config"]) {
      expect(params).not.toHaveProperty(cle);
    }
  });

  it("garde null pour une information absente : rien n'est complété", async () => {
    const fiche = ficheValide(); // CV sans téléphone
    expect(fiche.contact.telephone).toBeNull();
    const { client } = clientSimule(reponse([appelOutil(fiche)]));
    const r = await extraire(PDF, "modele-test", client);
    expect(r.fiche.contact.telephone).toBeNull();
    expect(r.fiche.identite.pays).toBeNull();
  });

  it("refait un seul essai avec les erreurs Zod, puis réussit", async () => {
    const invalide = { ...ficheValide(), contact: { ...ficheValide().contact, email: "pas-un-email" } };
    const { client, create } = clientSimule(
      reponse([appelOutil(invalide, "toolu_a")]),
      reponse([appelOutil(ficheValide(), "toolu_b")], { input_tokens: 1500, output_tokens: 250 }),
    );
    const r = await extraire(PDF, "modele-test", client);
    expect(r).toMatchObject({ nouvelEssai: true, sortiesInvalides: 1, sansAppelOutil: 0 });
    expect(r.jetonsEntree).toBe(2500);
    expect(r.jetonsSortie).toBe(450);
    // Le second appel rend la réponse fautive, puis un tool_result en erreur qui cite le champ.
    const messages = create.mock.calls[1]![0].messages;
    expect(messages).toHaveLength(3);
    expect(messages[1].role).toBe("assistant");
    const retour = messages[2].content[0];
    expect(retour).toMatchObject({ type: "tool_result", tool_use_id: "toolu_a", is_error: true });
    expect(retour.content).toContain("contact.email");
  });

  it("sortie invalide deux fois : un seul nouvel essai, puis EXTRACTION_IMPOSSIBLE", async () => {
    const invalide = { ...ficheValide(), competences: [""] };
    const { client, create } = clientSimule(reponse([appelOutil(invalide)]), reponse([appelOutil(invalide)]));
    const erreur = await extraire(PDF, "modele-test", client).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ErreurExtraction);
    expect((erreur as ErreurExtraction).code).toBe("EXTRACTION_IMPOSSIBLE");
    expect((erreur as ErreurExtraction).mesures).toMatchObject({ nouvelEssai: true, jetonsEntree: 2000, sansAppelOutil: 0, sortiesInvalides: 2 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("réponse sans appel de l'outil : compte comme un échec et consomme le nouvel essai", async () => {
    const { client, create } = clientSimule(reponse([texteSeul]), reponse([appelOutil(ficheValide())]));
    const r = await extraire(PDF, "modele-test", client);
    expect(r).toMatchObject({ nouvelEssai: true, sansAppelOutil: 1, sortiesInvalides: 0 });
    const relance = create.mock.calls[1]![0].messages[2].content[0];
    expect(relance.type).toBe("text");
    expect(relance.text).toContain(NOM_OUTIL);
  });

  it("deux réponses sans appel de l'outil : EXTRACTION_IMPOSSIBLE, comptées à part", async () => {
    const { client } = clientSimule(reponse([texteSeul]), reponse([texteSeul]));
    const erreur = (await extraire(PDF, "modele-test", client).catch((e: unknown) => e)) as ErreurExtraction;
    expect(erreur.code).toBe("EXTRACTION_IMPOSSIBLE");
    expect(erreur.mesures).toMatchObject({ sansAppelOutil: 2, sortiesInvalides: 0 });
  });

  it("erreur de l'API : MODELE_INDISPONIBLE, sans nouvel essai", async () => {
    const panne = new Anthropic.APIConnectionError({ message: "panne simulée" });
    const { client, create } = clientSimule(panne);
    const erreur = (await extraire(PDF, "modele-test", client).catch((e: unknown) => e)) as ErreurExtraction;
    expect(erreur).toBeInstanceOf(ErreurExtraction);
    expect(erreur.code).toBe("MODELE_INDISPONIBLE");
    expect(create).toHaveBeenCalledTimes(1);
  });
});
