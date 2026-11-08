/**
 * Liste des 8 CV fictifs. Affichés mais désactivés en T1 :
 * leurs fiches de référence seront produites en T2.
 */
import { CV_FICTIFS } from "@/lib/samples";

export default function ListeCVFictifs() {
  return (
    <section aria-labelledby="titre-fictifs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-fictifs" className="text-lg font-semibold">
          Ou choisir un CV fictif
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Disponible bientôt</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CV_FICTIFS.map((cv) => (
          <li key={cv.id}>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Disponible bientôt"
              className="flex w-full cursor-not-allowed flex-col items-start gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left opacity-70 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{cv.nom}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {cv.langue}
                </span>
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-300">{cv.titre}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {cv.particularite} · disponible bientôt
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
