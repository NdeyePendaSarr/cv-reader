/**
 * Journal : une ligne JSON par appel au modèle (docs/SPEC.md, « Variables d'environnement et journal »).
 *
 * La ligne est construite champ par champ à partir d'une liste fermée : aucun contenu
 * du CV, aucune valeur de la fiche, aucune adresse IP ni empreinte d'IP ne peut y entrer,
 * même si l'appelant passe un objet plus large.
 */

export interface LigneJournal {
  evenement: "extraction" | "comparaison";
  statut: "ok" | "extraction_impossible" | "modele_indisponible";
  dureeMs: number;
  jetonsEntree: number;
  jetonsSortie: number;
  modele: string;
  nouvelEssai: boolean;
  /** Nombre de réponses sans appel de l'outil (0, 1 ou 2). */
  sansAppelOutil: number;
  /** Nombre d'entrées de l'outil refusées par Zod (0, 1 ou 2). */
  sortiesInvalides: number;
  /** Nombre de valeurs « à vérifier » (un nombre, jamais les valeurs). */
  aVerifier?: number;
}

/** Champs autorisés, dans l'ordre d'écriture. */
const CHAMPS: readonly (keyof LigneJournal)[] = [
  "evenement",
  "statut",
  "dureeMs",
  "jetonsEntree",
  "jetonsSortie",
  "modele",
  "nouvelEssai",
  "sansAppelOutil",
  "sortiesInvalides",
  "aVerifier",
];

/** Construit la ligne JSON, sans aucun champ hors de la liste autorisée. */
export function formaterLigne(ligne: LigneJournal): string {
  const propre: Record<string, unknown> = {};
  for (const champ of CHAMPS) {
    if (ligne[champ] !== undefined) propre[champ] = ligne[champ];
  }
  return JSON.stringify(propre);
}

/** Écrit la ligne dans la sortie standard (journaux de la fonction Vercel). */
export function journaliser(ligne: LigneJournal, ecrire: (texte: string) => void = console.log): void {
  ecrire(formaterLigne(ligne));
}
