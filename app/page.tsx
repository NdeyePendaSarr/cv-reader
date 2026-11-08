/**
 * Page d'accueil : présentation, avertissement de démo, puis dépôt du CV (tranche T1).
 * Les étapes suivantes du parcours (validation, comparaison) arrivent en T2 à T4.
 */
import DepotCV from "@/components/DepotCV";
import ListeCVFictifs from "@/components/ListeCVFictifs";

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

        <DepotCV />
        <ListeCVFictifs />
      </main>
    </div>
  );
}
