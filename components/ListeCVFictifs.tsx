"use client";

/**
 * Liste des 8 CV fictifs. Un CV n'est cliquable que si sa fiche de référence existe
 * dans public/samples/ (produite par scripts/eval.ts --ecrire-references, jamais retouchée).
 * Tant que ce dossier est vide, tous restent désactivés avec la mention « disponible bientôt ».
 */
import { CV_FICTIFS } from "@/lib/samples";

export default function ListeCVFictifs({
  disponibles,
  surChoix,
  enChargement,
}: {
  /** Identifiants des CV dont la fiche de référence existe. */
  disponibles: readonly string[];
  surChoix: (id: string) => void;
  /** Identifiant du CV fictif en cours de chargement, ou null. */
  enChargement: string | null;
}) {
  const ouverts = new Set(disponibles);
  return (
    <section aria-labelledby="titre-fictifs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-fictifs" className="text-lg font-semibold">
          Ou choisir un CV fictif
        </h2>
        {ouverts.size === 0 && <span className="text-sm text-zinc-500 dark:text-zinc-400">Disponible bientôt</span>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CV_FICTIFS.map((cv) => {
          const charge = enChargement === cv.id;
          const actif = ouverts.has(cv.id) && enChargement === null;
          return (
            <li key={cv.id}>
              <button
                type="button"
                disabled={!actif}
                onClick={() => surChoix(cv.id)}
                aria-busy={charge}
                title={ouverts.has(cv.id) ? `Voir la fiche de ${cv.nom}` : "Disponible bientôt"}
                className={[
                  "flex w-full flex-col items-start gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left dark:border-zinc-800 dark:bg-zinc-900",
                  actif
                    ? "transition-colors hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-600"
                    : "cursor-not-allowed opacity-70",
                ].join(" ")}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{cv.nom}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {cv.langue}
                  </span>
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-300">{cv.titre}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {charge ? "Chargement de la fiche…" : cv.particularite}
                  {ouverts.has(cv.id) ? "" : " · disponible bientôt"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
