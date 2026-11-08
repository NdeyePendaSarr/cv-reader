/**
 * Page d'accueil : présentation, avertissement de démo, puis parcours du CV
 * (dépôt ou CV fictif, puis validation de la fiche et comparaison avec une offre).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ParcoursCV from "@/components/ParcoursCV";
import { extraireCriteres } from "@/lib/offre";
import { CV_FICTIFS } from "@/lib/samples";

/**
 * CV fictifs dont la fiche de référence existe dans public/samples/ (lu à la compilation).
 * Dossier absent ou vide : aucun CV fictif n'est encore disponible.
 */
function cvFictifsDisponibles(): string[] {
  let fichiers: string[];
  try {
    fichiers = readdirSync(join(process.cwd(), "public", "samples"));
  } catch {
    return [];
  }
  return CV_FICTIFS.map((cv) => cv.id).filter((id) => fichiers.includes(`${id}.json`));
}

/** Critères de l'offre de démonstration (samples/offre.md), lus à la compilation : aucun appel réseau. */
function criteresExemple(): string[] {
  try {
    return extraireCriteres(readFileSync(join(process.cwd(), "samples", "offre.md"), "utf8"));
  } catch {
    return [];
  }
}

export default function Accueil() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Bandeau d'avertissement, visible en permanence en haut de la page. */}
      <div
        role="note"
        className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        Démo : n&apos;envoyez pas de vrai CV, utilisez les CV fictifs.
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Lecteur de CV · en construction
          </p>
          <h1 className="text-5xl font-semibold tracking-tight">CV Reader</h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            CV Reader extrait les informations d&apos;un CV en PDF, vous laisse
            vérifier et corriger chaque champ, puis compare la fiche validée aux
            critères d&apos;une offre. La décision reste humaine.
          </p>
        </header>

        <ParcoursCV disponibles={cvFictifsDisponibles()} criteresExemple={criteresExemple()} />
      </main>
    </div>
  );
}
