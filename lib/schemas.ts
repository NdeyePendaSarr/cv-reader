/**
 * Schémas Zod de la spec (docs/SPEC.md, « Schémas de données »), écrits pour Zod 4.
 *
 * Écarts de forme imposés par Zod 4 (prévus par les questions ouvertes de la spec) :
 * - `z.string().email()` devient `z.email()` ;
 * - `z.string().datetime()` devient `z.iso.datetime()` ;
 * - l'option `message` de `.refine` devient `error`.
 *
 * Une information absente du CV vaut `null` (ou une liste vide) : aucun schéma
 * n'a de valeur par défaut, donc rien n'est complété à la place du CV.
 */
import { z } from "zod";

/** Texte recopié du CV, ou null s'il est absent. Jamais de chaîne vide. */
const Texte = z.string().trim().min(1).nullable();

export const ExperienceSchema = z.object({
  poste: Texte,
  entreprise: Texte,
  lieu: Texte,
  debut: Texte, // tel qu'écrit : « mars 2024 », « 2024 »
  fin: Texte, // « en cours » seulement si le CV le dit
  description: Texte,
});

export const FormationSchema = z.object({
  diplome: Texte,
  etablissement: Texte,
  debut: Texte,
  fin: Texte,
});

export const LangueSchema = z.object({
  langue: z.string().trim().min(1),
  niveau: Texte,
});

export const FicheCVSchema = z.object({
  identite: z.object({
    nomComplet: Texte,
    titre: Texte,
    ville: Texte,
    pays: Texte,
  }),
  contact: z.object({
    email: z.email().nullable(),
    telephone: Texte,
    linkedin: Texte,
    github: Texte,
    siteWeb: Texte,
  }),
  competences: z.array(z.string().trim().min(1)),
  experiences: z.array(ExperienceSchema),
  formations: z.array(FormationSchema),
  langues: z.array(LangueSchema),
  langueDuCV: z.enum(["fr", "en", "autre"]),
});
export type FicheCV = z.infer<typeof FicheCVSchema>;

/** Ce que l'utilisatrice télécharge après avoir cliqué sur « Valider ». */
export const FicheValideeSchema = z.object({
  versionSchema: z.literal(1),
  fiche: FicheCVSchema,
  champsCorriges: z.number().int().min(0), // champs modifiés par l'humain
  valideeLe: z.iso.datetime(),
  modele: z.string().min(1),
});
export type FicheValidee = z.infer<typeof FicheValideeSchema>;

/** Résultat pour un critère de l'offre. Aucun score, aucun verdict. */
export const CritereResultatSchema = z
  .object({
    critere: z.string().trim().min(1),
    statut: z.enum(["present", "non_trouve"]),
    justification: Texte, // extrait recopié de la fiche validée
  })
  .refine((r) => (r.statut === "present") === (r.justification !== null), {
    error: "Une justification est exigée si et seulement si le critère est présent",
  });
export type CritereResultat = z.infer<typeof CritereResultatSchema>;

export const ComparaisonSchema = z.object({
  resultats: z.array(CritereResultatSchema).min(1).max(20),
});
export type Comparaison = z.infer<typeof ComparaisonSchema>;
