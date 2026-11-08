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
  // Chemins (ex. « contact.telephone ») encore « à vérifier » au moment de la validation :
  // ni confirmés ni corrigés (« Valider quand même »). Liste vide si tout est vérifié.
  nonVerifiees: z.array(z.string()),
  valideeLe: z.iso.datetime(),
  modele: z.string().min(1),
});
export type FicheValidee = z.infer<typeof FicheValideeSchema>;

const CritereBase = z.object({
  critere: z.string().trim().min(1),
  statut: z.enum(["present", "non_trouve"]),
  justification: Texte, // extrait recopié de la fiche validée
});

/** « Présent » exige une justification ; « non trouvé » n'en a pas. */
const justificationCoherente = {
  test: (r: { statut: string; justification: string | null }) => (r.statut === "present") === (r.justification !== null),
  error: "Une justification est exigée si et seulement si le critère est présent",
};

/** Résultat pour un critère de l'offre. Aucun score, aucun verdict. */
export const CritereResultatSchema = CritereBase.refine(justificationCoherente.test, { error: justificationCoherente.error });
export type CritereResultat = z.infer<typeof CritereResultatSchema>;

/** Sortie attendue du modèle (outil enregistrer_comparaison). */
export const ComparaisonSchema = z.object({
  resultats: z.array(CritereResultatSchema).min(1).max(20),
});
export type Comparaison = z.infer<typeof ComparaisonSchema>;

/** Corps de POST /api/compare : la fiche validée et de 1 à 20 critères de 200 caractères au plus. */
export const RequeteComparaisonSchema = z.object({
  fiche: FicheCVSchema,
  criteres: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
});
export type RequeteComparaison = z.infer<typeof RequeteComparaisonSchema>;

/**
 * Résultat renvoyé à l'interface : celui du modèle après le contrôle anti-invention du serveur.
 * `justificationRejetee` : le modèle avait répondu « présent », mais sa justification est
 * introuvable dans la fiche ; le critère est donc passé en « non trouvé ».
 */
export const CritereAfficheSchema = CritereBase.extend({ justificationRejetee: z.boolean() }).refine(
  justificationCoherente.test,
  { error: justificationCoherente.error },
);
export type CritereAffiche = z.infer<typeof CritereAfficheSchema>;

/** Réponse 200 de POST /api/compare. Aucun score, aucun total. */
export const ReponseComparaisonSchema = z.object({
  resultats: z.array(CritereAfficheSchema).min(1).max(20),
});
export type ReponseComparaison = z.infer<typeof ReponseComparaisonSchema>;
