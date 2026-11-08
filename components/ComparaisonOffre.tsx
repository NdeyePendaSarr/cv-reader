"use client";

/**
 * Comparaison de la fiche validée aux critères d'une offre (tranche T4).
 * Pour chaque critère : « présent » avec l'élément de la fiche qui le justifie, ou « non trouvé ».
 * Aucun score, aucun pourcentage, aucun total : la décision reste humaine.
 */
import { useId, useState } from "react";
import { comparerFiche } from "@/lib/api-client";
import { criteresSaisis } from "@/lib/offre";
import type { CritereAffiche, FicheCV } from "@/lib/schemas";

/** Limites de la route /api/compare (docs/SPEC.md, « Routes API »), vérifiées aussi par le serveur. */
const CRITERES_MAX = 20;
const LONGUEUR_MAX = 200;

type Etat =
  | { type: "attente" }
  | { type: "envoi" }
  | { type: "erreur"; message: string }
  | { type: "resultats"; resultats: CritereAffiche[] };

/** Contrôle des critères dans le navigateur, avant l'envoi (le serveur refait le même). */
function erreurCriteres(criteres: string[]): string | null {
  if (criteres.length === 0) return "Saisissez au moins un critère, un par ligne.";
  if (criteres.length > CRITERES_MAX) return `Indiquez au plus ${CRITERES_MAX} critères (vous en avez saisi ${criteres.length}).`;
  const tropLong = criteres.find((c) => c.length > LONGUEUR_MAX);
  if (tropLong) return `Chaque critère doit faire au plus ${LONGUEUR_MAX} caractères : « ${tropLong.slice(0, 40)}… » est trop long.`;
  return null;
}

export default function ComparaisonOffre({
  fiche,
  criteresExemple,
}: {
  /** Fiche validée par l'humain : la comparaison ne part jamais de la fiche brute. */
  fiche: FicheCV;
  criteresExemple: readonly string[];
}) {
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<Etat>({ type: "attente" });
  const idZone = useId();
  const idAide = useId();
  const enCours = etat.type === "envoi";

  async function lancer() {
    const criteres = criteresSaisis(texte);
    const erreur = erreurCriteres(criteres);
    if (erreur) {
      setEtat({ type: "erreur", message: erreur });
      return;
    }
    setEtat({ type: "envoi" });
    const resultat = await comparerFiche(fiche, criteres);
    setEtat(resultat.ok ? { type: "resultats", resultats: resultat.donnees.resultats } : { type: "erreur", message: resultat.message });
  }

  return (
    <section aria-labelledby="titre-comparaison" className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 id="titre-comparaison" className="text-base font-semibold">
        Comparer la fiche validée à une offre
      </h3>
      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        Aide à la lecture. La décision reste humaine.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={idZone} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Critères de l&apos;offre
        </label>
        <textarea
          id={idZone}
          rows={6}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          aria-describedby={idAide}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 focus-visible:outline-2 focus-visible:outline-indigo-600"
        />
        <p id={idAide} className="text-xs text-zinc-500 dark:text-zinc-400">
          Un critère par ligne, {CRITERES_MAX} au plus, {LONGUEUR_MAX} caractères chacun.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTexte(criteresExemple.join("\n"))}
          disabled={enCours || criteresExemple.length === 0}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Utiliser les critères d&apos;exemple
        </button>
        <button
          type="button"
          onClick={() => void lancer()}
          disabled={enCours}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
        >
          {enCours ? "Comparaison en cours…" : "Comparer"}
        </button>
      </div>

      <div aria-live="polite">
        {etat.type === "envoi" && <p className="text-sm text-zinc-600 dark:text-zinc-300">Comparaison en cours…</p>}
        {etat.type === "erreur" && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {etat.message}
          </p>
        )}
        {etat.type === "resultats" && (
          <ul aria-label="Résultats de la comparaison" className="flex flex-col gap-3">
            {etat.resultats.map((r, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-sm font-medium">{r.critere}</span>
                {r.statut === "present" ? (
                  <span className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                      présent
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300">« {r.justification} »</span>
                  </span>
                ) : (
                  <span className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      non trouvé
                    </span>
                    {r.justificationRejetee && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        justification du modèle introuvable dans la fiche
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
