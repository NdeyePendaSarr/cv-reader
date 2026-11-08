/**
 * Les 8 CV fictifs de la démo (personnes inventées, aucune donnée réelle).
 *
 * Chaque CV a deux fichiers dans samples/ : `<id>.pdf` (produit par
 * scripts/generer-cv.ts) et `<id>.json` (réponse attendue, écrite à la main).
 * Leurs fiches de référence, vraies sorties du modèle, sont dans public/samples/.
 *
 * Les descriptions décrivent le cas de test, jamais la personne : l'interface ne qualifie personne.
 */

import { z } from "zod";
import { FicheCVSchema } from "@/lib/schemas";

/**
 * Fiche de référence d'un CV fictif (public/samples/<id>.json) : exactement ce que le modèle
 * a produit lors de l'évaluation (scripts/eval.ts --ecrire-references), jamais retouchée.
 */
export const FicheReferenceSchema = z.object({
  fiche: FicheCVSchema,
  aVerifier: z.array(z.string()),
  modele: z.string().min(1),
  genereLe: z.iso.datetime(),
});
export type FicheReference = z.infer<typeof FicheReferenceSchema>;

/** Cas de test couvert par le CV (et non jugement sur la personne). */
export type ProfilCV = "proche-offre" | "partiel" | "hors-sujet" | "incomplet" | "deux-colonnes" | "scanne";

export interface CVFictif {
  id: string;
  nom: string;
  titre: string;
  langue: "fr" | "en";
  profil: ProfilCV;
  /** Ce que ce CV permet de tester. */
  particularite: string;
}

export const CV_FICTIFS: readonly CVFictif[] = [
  {
    id: "cv-01-lea-fictivia",
    nom: "Léa Fictivia",
    titre: "Développeuse full-stack TypeScript",
    langue: "fr",
    profil: "proche-offre",
    particularite: "Cas de test : profil proche de l'offre",
  },
  {
    id: "cv-02-sam-placeholder",
    nom: "Sam Placeholder",
    titre: "Backend Developer (Node.js)",
    langue: "en",
    profil: "proche-offre",
    particularite: "Cas de test : profil proche de l'offre, CV en anglais",
  },
  {
    id: "cv-03-hugo-exemplaire",
    nom: "Hugo Exemplaire",
    titre: "Intégrateur front-end",
    langue: "fr",
    profil: "partiel",
    particularite: "Cas de test : profil partiel (front-end seulement)",
  },
  {
    id: "cv-04-robin-sample",
    nom: "Robin Sample",
    titre: "Python Developer",
    langue: "en",
    profil: "partiel",
    particularite: "Cas de test : profil partiel, CV en anglais",
  },
  {
    id: "cv-05-margot-imaginaire",
    nom: "Margot Imaginaire",
    titre: "Comptable",
    langue: "fr",
    profil: "hors-sujet",
    particularite: "Cas de test : CV hors sujet avec consigne cachée",
  },
  {
    id: "cv-06-nina-inventee",
    nom: "Nina Inventée",
    titre: "Développeuse web junior",
    langue: "fr",
    profil: "incomplet",
    particularite: "Cas de test : CV incomplet (sans téléphone, dates manquantes)",
  },
  {
    id: "cv-07-yanis-fictif",
    nom: "Yanis Fictif",
    titre: "Développeur full-stack",
    langue: "fr",
    profil: "deux-colonnes",
    particularite: "Cas de test : mise en page sur deux colonnes",
  },
  {
    id: "cv-08-chloe-demo",
    nom: "Chloé Démo",
    titre: "Développeuse mobile",
    langue: "fr",
    profil: "scanne",
    particularite: "Cas de test : PDF scanné, sans texte sélectionnable",
  },
];
