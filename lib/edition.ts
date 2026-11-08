/**
 * Logique de la validation humaine (tranche T3), sans dépendance à React : testable seule.
 *
 * La fiche extraite devient une « fiche en édition ». Chaque élément de liste (compétence,
 * expérience, formation, langue) y reçoit une clé stable et garde sa position d'origine :
 * on sait ainsi, même après une suppression, quels champs étaient « à vérifier » et quels
 * éléments ont été ajoutés ou supprimés.
 */
import { FicheCVSchema, FicheValideeSchema, type FicheCV, type FicheValidee } from "@/lib/schemas";

type Experience = FicheCV["experiences"][number];
type Formation = FicheCV["formations"][number];
type Langue = FicheCV["langues"][number];

/** Un élément de liste en édition. `origine` : sa position dans la fiche extraite, ou null s'il a été ajouté. */
export interface Element<T> {
  cle: string;
  origine: number | null;
  valeur: T;
}

export interface FicheEnEdition {
  identite: FicheCV["identite"];
  contact: FicheCV["contact"];
  competences: Element<string>[];
  experiences: Element<Experience>[];
  formations: Element<Formation>[];
  langues: Element<Langue>[];
  langueDuCV: FicheCV["langueDuCV"];
}

export const CHAMPS_EXPERIENCE = ["poste", "entreprise", "lieu", "debut", "fin", "description"] as const;
export const CHAMPS_FORMATION = ["diplome", "etablissement", "debut", "fin"] as const;

/** Fiche extraite → fiche en édition (les clés d'origine sont « o0 », « o1 »…). */
export function depuisFiche(fiche: FicheCV): FicheEnEdition {
  const elements = <T>(liste: T[]): Element<T>[] =>
    liste.map((valeur, i) => ({ cle: `o${i}`, origine: i, valeur: structuredClone(valeur) }));
  return {
    identite: { ...fiche.identite },
    contact: { ...fiche.contact },
    competences: elements(fiche.competences),
    experiences: elements(fiche.experiences),
    formations: elements(fiche.formations),
    langues: elements(fiche.langues),
    langueDuCV: fiche.langueDuCV,
  };
}

/** Valeur saisie → valeur de fiche : espaces retirés aux bords, champ vidé → null (jamais de chaîne vide). */
export function versTexte(valeur: string | null): string | null {
  if (valeur === null) return null;
  const propre = valeur.trim();
  return propre === "" ? null : propre;
}

/**
 * Fiche en édition → fiche (avant validation par Zod). Les champs facultatifs vidés valent null.
 * Une compétence ou un nom de langue vide reste une chaîne vide : Zod la refusera, et l'erreur
 * invitera à remplir ou à supprimer l'élément.
 */
export function versFiche(edition: FicheEnEdition): FicheCV {
  const texteObligatoire = (v: string) => v.trim();
  const objet = <T extends Record<string, string | null>>(o: T): T =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, versTexte(v)])) as T;
  return {
    identite: objet(edition.identite),
    contact: objet(edition.contact),
    competences: edition.competences.map((e) => texteObligatoire(e.valeur)),
    experiences: edition.experiences.map((e) => objet(e.valeur)),
    formations: edition.formations.map((e) => objet(e.valeur)),
    langues: edition.langues.map((e) => ({ langue: texteObligatoire(e.valeur.langue), niveau: versTexte(e.valeur.niveau) })),
    langueDuCV: edition.langueDuCV,
  };
}

// ---------------------------------------------------------------------------
// Champs du formulaire : clé d'édition, chemin d'origine, valeur.
// ---------------------------------------------------------------------------

/** Un champ du formulaire, dans l'ordre d'affichage. */
export interface Champ {
  /** Clé stable dans le formulaire, ex. « identite.ville », « competences@o2 », « experiences@n1.poste ». */
  cle: string;
  /** Chemin dans la fiche extraite (ex. « competences.2 »), ou null pour un élément ajouté. */
  origine: string | null;
  /** Valeur actuelle, normalisée (null si vide). */
  valeur: string | null;
}

/** Liste tous les champs texte du formulaire, dans l'ordre d'affichage. */
export function listerChamps(edition: FicheEnEdition): Champ[] {
  const champs: Champ[] = [];
  for (const [k, v] of Object.entries(edition.identite)) champs.push({ cle: `identite.${k}`, origine: `identite.${k}`, valeur: versTexte(v) });
  for (const [k, v] of Object.entries(edition.contact)) champs.push({ cle: `contact.${k}`, origine: `contact.${k}`, valeur: versTexte(v) });
  for (const e of edition.competences) {
    champs.push({ cle: `competences@${e.cle}`, origine: e.origine === null ? null : `competences.${e.origine}`, valeur: versTexte(e.valeur) });
  }
  const sousChamps = <T extends Record<string, string | null>>(nom: string, liste: Element<T>[], cles: readonly (keyof T & string)[]) => {
    for (const e of liste) {
      for (const k of cles) {
        champs.push({
          cle: `${nom}@${e.cle}.${k}`,
          origine: e.origine === null ? null : `${nom}.${e.origine}.${k}`,
          valeur: versTexte(e.valeur[k] ?? null),
        });
      }
    }
  };
  sousChamps("experiences", edition.experiences, CHAMPS_EXPERIENCE);
  sousChamps("formations", edition.formations, CHAMPS_FORMATION);
  sousChamps("langues", edition.langues, ["langue", "niveau"]);
  return champs;
}

/** Valeur d'un chemin (« competences.2 », « experiences.0.poste ») dans la fiche extraite. */
export function valeurOrigine(fiche: FicheCV, chemin: string): string | null {
  let courant: unknown = fiche;
  for (const morceau of chemin.split(".")) {
    if (courant === null || typeof courant !== "object") return null;
    courant = (courant as Record<string, unknown>)[morceau];
  }
  return typeof courant === "string" ? courant : null;
}

/** Vrai si le champ a une valeur différente de la valeur extraite (les éléments ajoutés le sont toujours). */
export function estModifie(champ: Champ, originale: FicheCV): boolean {
  if (champ.origine === null) return true;
  return champ.valeur !== versTexte(valeurOrigine(originale, champ.origine));
}

/**
 * Champs encore « à vérifier » : signalés par la vérification contre le texte du PDF,
 * ni confirmés, ni modifiés. Un élément supprimé n'a plus de champ, donc plus rien à vérifier.
 */
export function champsAVerifierRestants(
  edition: FicheEnEdition,
  originale: FicheCV,
  aVerifier: readonly string[],
  confirmes: ReadonlySet<string>,
): Champ[] {
  const signales = new Set(aVerifier);
  return listerChamps(edition).filter(
    (c) => c.origine !== null && signales.has(c.origine) && !confirmes.has(c.origine) && !estModifie(c, originale),
  );
}

// ---------------------------------------------------------------------------
// Nombre de champs corrigés.
// ---------------------------------------------------------------------------

/**
 * Nombre de champs corrigés par l'humain. Règle exacte (reprise dans docs/SPEC.md) :
 *
 * 1. Les valeurs sont comparées après normalisation : espaces retirés aux bords, champ vide = null.
 *    La comparaison tient compte des majuscules (« react » au lieu de « React » est une correction).
 * 2. Identité, contact et langue du CV : +1 par champ feuille dont la valeur finale diffère de la valeur extraite.
 * 3. Listes (compétences, expériences, formations, langues), élément par élément, d'après sa position d'origine :
 *    - élément conservé : +1 par champ feuille modifié (une compétence est un seul champ ; une expérience
 *      en a six, description comprise ; une formation quatre ; une langue deux) ;
 *    - élément supprimé : +1 (quel que soit son nombre de champs) ;
 *    - élément ajouté : +1 (quel que soit son nombre de champs).
 * 4. Une confirmation « à vérifier » sans modification ne compte pas. Un champ modifié puis remis
 *    à sa valeur d'origine ne compte pas.
 */
export function compterCorrections(originale: FicheCV, edition: FicheEnEdition): number {
  const finale = versFiche(edition);
  let total = 0;
  const comparer = (a: string | null, b: string | null) => (versTexte(a) === versTexte(b) ? 0 : 1);

  for (const k of Object.keys(originale.identite) as (keyof FicheCV["identite"])[]) {
    total += comparer(originale.identite[k], finale.identite[k]);
  }
  for (const k of Object.keys(originale.contact) as (keyof FicheCV["contact"])[]) {
    total += comparer(originale.contact[k], finale.contact[k]);
  }
  if (originale.langueDuCV !== finale.langueDuCV) total += 1;

  const liste = <T>(
    origine: T[],
    elements: Element<unknown>[],
    valeursFinales: T[],
    champsModifies: (avant: T, apres: T) => number,
  ) => {
    const conserves = new Set<number>();
    elements.forEach((e, i) => {
      if (e.origine === null) total += 1; // élément ajouté
      else {
        conserves.add(e.origine);
        total += champsModifies(origine[e.origine]!, valeursFinales[i]!);
      }
    });
    total += origine.filter((_, i) => !conserves.has(i)).length; // éléments supprimés
  };
  const parChamps = <T extends Record<string, string | null>>(cles: readonly (keyof T)[]) =>
    (avant: T, apres: T) => cles.reduce((n, k) => n + comparer(avant[k] ?? null, apres[k] ?? null), 0);

  liste(originale.competences, edition.competences, finale.competences, (a, b) => comparer(a, b));
  liste(originale.experiences, edition.experiences, finale.experiences, parChamps<Experience>(CHAMPS_EXPERIENCE));
  liste(originale.formations, edition.formations, finale.formations, parChamps<Formation>(CHAMPS_FORMATION));
  liste(originale.langues, edition.langues, finale.langues, parChamps<Langue>(["langue", "niveau"]));
  return total;
}

// ---------------------------------------------------------------------------
// Validation par Zod, avec des messages en français rattachés aux champs.
// ---------------------------------------------------------------------------

export type ResultatValidation =
  | { ok: true; fiche: FicheCV }
  | { ok: false; erreurs: Record<string, string> };

/** Message en français pour une erreur Zod, selon le champ concerné. */
function messageErreur(chemin: (string | number)[], code: string): string {
  const dernier = String(chemin[chemin.length - 1]);
  if (chemin[0] === "contact" && dernier === "email") {
    return "Adresse e-mail invalide. Corrigez-la, ou videz le champ si le CV n'en donne pas.";
  }
  if (code === "too_small") {
    return "Ce champ ne peut pas être vide : remplissez-le, ou supprimez l'élément.";
  }
  return "Valeur invalide.";
}

/** Chemin d'erreur Zod (indices de la fiche finale) → clé du champ dans le formulaire. */
function cleDuChemin(edition: FicheEnEdition, chemin: (string | number)[]): string {
  const [zone, index, sousChamp] = chemin;
  if (zone === "identite" || zone === "contact") return `${zone}.${String(index)}`;
  if (zone === "competences" || zone === "experiences" || zone === "formations" || zone === "langues") {
    const element = edition[zone][Number(index)];
    if (!element) return String(zone);
    return sousChamp === undefined ? `${zone}@${element.cle}` : `${zone}@${element.cle}.${String(sousChamp)}`;
  }
  return chemin.map(String).join(".") || "fiche";
}

/** Valide le formulaire avec FicheCVSchema ; en cas d'échec, une erreur en français par champ. */
export function validerEdition(edition: FicheEnEdition): ResultatValidation {
  const resultat = FicheCVSchema.safeParse(versFiche(edition));
  if (resultat.success) return { ok: true, fiche: resultat.data };
  const erreurs: Record<string, string> = {};
  for (const issue of resultat.error.issues) {
    const chemin = issue.path.map((p) => (typeof p === "symbol" ? String(p) : p));
    const cle = cleDuChemin(edition, chemin);
    erreurs[cle] ??= messageErreur(chemin, issue.code);
  }
  return { ok: false, erreurs };
}

// ---------------------------------------------------------------------------
// Fiche validée et fichier téléchargé.
// ---------------------------------------------------------------------------

/** Construit la fiche validée ({ versionSchema, fiche, champsCorriges, valideeLe, modele }), contrôlée par Zod. */
export function construireFicheValidee(
  originale: FicheCV,
  edition: FicheEnEdition,
  modele: string,
  maintenant: Date = new Date(),
): FicheValidee {
  return FicheValideeSchema.parse({
    versionSchema: 1,
    fiche: versFiche(edition),
    champsCorriges: compterCorrections(originale, edition),
    valideeLe: maintenant.toISOString(),
    modele,
  });
}

/** « Chloé Démo », date locale → « fiche-chloe-demo-2026-11-08.json ». Sans nom : « fiche-sans-nom-… ». */
export function nomFichier(nomComplet: string | null, date: Date): string {
  const nom =
    (nomComplet ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sans-nom";
  const deux = (n: number) => String(n).padStart(2, "0");
  const jour = `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
  return `fiche-${nom}-${jour}.json`;
}
