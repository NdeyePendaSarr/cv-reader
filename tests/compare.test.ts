/**
 * lib/compare.ts avec un client simulé : aucun appel réel à l'API.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { ClientMessages } from "@/lib/claude";
import { ErreurExtraction } from "@/lib/claude";
import {
  comparer,
  CONSIGNE_COMPARAISON,
  controlerJustifications,
  erreursOrdre,
  justificationDansLaFiche,
  NOM_OUTIL_COMPARAISON,
} from "@/lib/compare";
import type { FicheCV } from "@/lib/schemas";

const fiche: FicheCV = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "samples", "cv-01-lea-fictivia.json"), "utf8"),
);
const CRITERES = ["Pratique de React", "Expérience de Kotlin", "Anglais technique lu"];

function reponse(input: unknown): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "modele-test",
    content: [{ type: "tool_use", id: "toolu_c", name: NOM_OUTIL_COMPARAISON, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 300 },
  } as unknown as Anthropic.Message;
}

function clientSimule(...entrees: unknown[]) {
  const create = vi.fn();
  for (const e of entrees) create.mockResolvedValueOnce(reponse(e));
  return { client: { messages: { create } } as unknown as ClientMessages, create };
}

const sortieValide = {
  resultats: [
    { critere: "Pratique de React", statut: "present", justification: "React" },
    { critere: "Expérience de Kotlin", statut: "non_trouve", justification: null },
    { critere: "Anglais technique lu", statut: "present", justification: "courant (C1)" },
  ],
};

describe("contrôle anti-invention", () => {
  it("retrouve une justification malgré les majuscules et les espaces", () => {
    expect(justificationDansLaFiche("  API   claude ", fiche)).toBe(true);
    expect(justificationDansLaFiche("Intégration de l'API Claude pour résumer les tickets clients", fiche)).toBe(true);
  });

  it("ne colle pas la fin d'un champ au début du suivant", () => {
    // « TypeScript » et « JavaScript » sont deux compétences voisines, pas un même champ.
    expect(justificationDansLaFiche("TypeScript JavaScript", fiche)).toBe(false);
  });

  it("justification absente de la fiche → non_trouve, justification null, justificationRejetee", () => {
    const resultats = controlerJustifications(
      [
        { critere: "Pratique de React", statut: "present", justification: "Cinq ans de React Native" },
        { critere: "Anglais technique lu", statut: "present", justification: "courant (C1)" },
      ],
      ["Pratique de React", "Anglais technique lu"],
      fiche,
    );
    expect(resultats).toEqual([
      { critere: "Pratique de React", statut: "non_trouve", justification: null, justificationRejetee: true },
      { critere: "Anglais technique lu", statut: "present", justification: "courant (C1)", justificationRejetee: false },
    ]);
  });

  it("garde le texte du critère envoyé, pas celui recopié par le modèle", () => {
    const [r] = controlerJustifications(
      [{ critere: "pratique de react", statut: "non_trouve", justification: null }],
      ["Pratique de React"],
      fiche,
    );
    expect(r!.critere).toBe("Pratique de React");
  });
});

describe("erreursOrdre", () => {
  it("signale un nombre de résultats différent", () => {
    expect(erreursOrdre(sortieValide.resultats.slice(0, 2) as never, CRITERES)[0]).toMatch(/2 résultat\(s\) reçu\(s\) pour 3/);
  });

  it("signale un ordre différent", () => {
    const inverse = [sortieValide.resultats[1], sortieValide.resultats[0], sortieValide.resultats[2]];
    expect(erreursOrdre(inverse as never, CRITERES)).toHaveLength(2);
  });
});

describe("comparer", () => {
  it("renvoie un résultat par critère, contrôlé, avec les mesures", async () => {
    const { client, create } = clientSimule(sortieValide);
    const r = await comparer(fiche, CRITERES, "modele-test", client);
    expect(r.resultats.map((x) => x.statut)).toEqual(["present", "non_trouve", "present"]);
    expect(r.justificationsRejetees).toBe(0);
    expect(r.mesures).toMatchObject({ jetonsEntree: 2000, jetonsSortie: 300, nouvelEssai: false });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("même mécanique que l'extraction : consigne, outil en tool_choice auto non strict, aucun réglage d'échantillonnage", async () => {
    const { client, create } = clientSimule(sortieValide);
    await comparer(fiche, CRITERES, "modele-test", client);
    const params = create.mock.calls[0]![0];
    expect(params.system).toBe(CONSIGNE_COMPARAISON);
    expect(params.tool_choice).toEqual({ type: "auto" });
    expect(params.tools[0].name).toBe(NOM_OUTIL_COMPARAISON);
    expect(params.tools[0]).not.toHaveProperty("strict");
    for (const cle of ["temperature", "top_p", "top_k"]) expect(params).not.toHaveProperty(cle);
    // La fiche et les critères sont envoyés comme des données délimitées.
    const texte = params.messages[0].content[0].text as string;
    expect(texte).toContain("<fiche>");
    expect(texte).toContain("1. Pratique de React");
  });

  it("nombre de critères différent → sortie invalide, puis nouvel essai qui réussit", async () => {
    const incomplet = { resultats: sortieValide.resultats.slice(0, 2) };
    const { client, create } = clientSimule(incomplet, sortieValide);
    const r = await comparer(fiche, CRITERES, "modele-test", client);
    expect(r.mesures).toMatchObject({ nouvelEssai: true, sortiesInvalides: 1 });
    expect(create.mock.calls[1]![0].messages[2].content[0].content).toMatch(/il en faut exactement un par critère/);
  });

  it("ordre différent → sortie invalide, puis nouvel essai", async () => {
    const desordre = { resultats: [sortieValide.resultats[2], sortieValide.resultats[0], sortieValide.resultats[1]] };
    const { client, create } = clientSimule(desordre, sortieValide);
    const r = await comparer(fiche, CRITERES, "modele-test", client);
    expect(r.mesures.nouvelEssai).toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("« présent » sans justification → sortie invalide (schéma), puis nouvel essai", async () => {
    const incoherent = {
      resultats: [{ ...sortieValide.resultats[0], justification: null }, ...sortieValide.resultats.slice(1)],
    };
    const { client } = clientSimule(incoherent, sortieValide);
    const r = await comparer(fiche, CRITERES, "modele-test", client);
    expect(r.mesures).toMatchObject({ nouvelEssai: true, sortiesInvalides: 1 });
  });

  it("sortie invalide deux fois → EXTRACTION_IMPOSSIBLE (422) avec un message propre à la comparaison", async () => {
    const incomplet = { resultats: sortieValide.resultats.slice(0, 1) };
    const { client } = clientSimule(incomplet, incomplet);
    const erreur = (await comparer(fiche, CRITERES, "modele-test", client).catch((e: unknown) => e)) as ErreurExtraction;
    expect(erreur).toBeInstanceOf(ErreurExtraction);
    expect(erreur.code).toBe("EXTRACTION_IMPOSSIBLE");
    expect(erreur.message).toMatch(/comparaison/);
  });

  it("une justification inventée est rejetée après coup, sans nouvel essai", async () => {
    const invente = {
      resultats: [
        { critere: "Pratique de React", statut: "present", justification: "Dix ans de React" },
        ...sortieValide.resultats.slice(1),
      ],
    };
    const { client, create } = clientSimule(invente);
    const r = await comparer(fiche, CRITERES, "modele-test", client);
    expect(create).toHaveBeenCalledTimes(1);
    expect(r.justificationsRejetees).toBe(1);
    expect(r.resultats[0]).toEqual({ critere: "Pratique de React", statut: "non_trouve", justification: null, justificationRejetee: true });
  });
});
