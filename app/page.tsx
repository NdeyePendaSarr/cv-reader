/**
 * Page d'accueil (tranche T0) : présentation de l'outil et avertissement de démo.
 * Aucune fonctionnalité pour l'instant : le dépôt du PDF arrive en T1.
 */
export default function Accueil() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Bandeau d'avertissement, visible en permanence en haut de la page. */}
      <div
        role="alert"
        className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        Démo : n&apos;envoyez pas de vrai CV, utilisez les CV fictifs.
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Lecteur de CV · en construction
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">CV Reader</h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          CV Reader extrait les informations d&apos;un CV en PDF, vous laisse
          vérifier et corriger chaque champ, puis compare la fiche validée aux
          critères d&apos;une offre. La décision reste humaine.
        </p>
      </main>
    </div>
  );
}
