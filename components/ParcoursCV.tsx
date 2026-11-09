"use client";

/**
 * Parcours de la page d'accueil, en trois étapes visibles en haut de la zone de travail :
 * 1. Choisir un CV (dépôt d'un PDF ou CV fictif), 2. Vérifier la fiche, 3. Comparer à l'offre.
 *
 * Une fois une fiche chargée, le choix du CV se replie en une ligne (« Changer de CV »).
 * Les fiches des CV fictifs sont lues depuis public/samples/, sans appel au modèle.
 */
import { useRef, useState } from "react";
import DepotCV from "@/components/DepotCV";
import FicheEditable from "@/components/FicheEditable";
import ListeCVFictifs from "@/components/ListeCVFictifs";
import { CV_FICTIFS, FicheReferenceSchema } from "@/lib/samples";
import type { FicheCV } from "@/lib/schemas";

interface FicheAffichee {
  fiche: FicheCV;
  aVerifier: string[];
  modele: string;
  source: string;
  /** Change à chaque nouvelle fiche : le formulaire repart de zéro (corrections, confirmations, validation). */
  numero: number;
}

const ETAPES = ["Choisir un CV", "Vérifier la fiche", "Comparer à l'offre"] as const;

/** Indicateur des trois étapes : l'étape en cours est mise en évidence, les étapes terminées sont cochées. */
function Etapes({ enCours, terminees }: { enCours: number; terminees: readonly boolean[] }) {
  return (
    <ol aria-label="Étapes du parcours" className="flex flex-wrap gap-2 text-sm">
      {ETAPES.map((libelle, i) => {
        const terminee = terminees[i] ?? false;
        const active = i === enCours;
        return (
          <li
            key={libelle}
            aria-current={active ? "step" : undefined}
            className={[
              "flex items-center gap-2 rounded-full border px-3 py-1.5",
              active
                ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                : terminee
                  ? "border-emerald-300 text-emerald-900 dark:border-emerald-800 dark:text-emerald-200"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400",
            ].join(" ")}
          >
            <span aria-hidden="true">{terminee ? "✓" : `${i + 1}.`}</span>
            <span>
              {terminee && <span className="sr-only">Terminé : </span>}
              {libelle}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ParcoursCV({
  disponibles,
  criteresExemple,
}: {
  disponibles: readonly string[];
  /** Critères de samples/offre.md, lus à la compilation de la page. */
  criteresExemple: readonly string[];
}) {
  const [affichee, setAffichee] = useState<FicheAffichee | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  const [erreurFictif, setErreurFictif] = useState<string | null>(null);
  const [choixOuvert, setChoixOuvert] = useState(true);
  const [validee, setValidee] = useState(false);
  const [compare, setCompare] = useState(false);
  const numero = useRef(0);

  function afficher(fiche: Omit<FicheAffichee, "numero">) {
    numero.current += 1;
    setAffichee({ ...fiche, numero: numero.current });
    setChoixOuvert(false); // le choix du CV se replie en une ligne
    setValidee(false);
    setCompare(false);
  }

  async function choisirFictif(id: string) {
    const cv = CV_FICTIFS.find((c) => c.id === id);
    setErreurFictif(null);
    setChargement(id);
    try {
      const reponse = await fetch(`/samples/${id}.json`);
      const reference = FicheReferenceSchema.safeParse(await reponse.json());
      if (!reponse.ok || !reference.success) throw new Error("fiche de référence illisible");
      const { fiche, aVerifier, modele } = reference.data;
      afficher({ fiche, aVerifier, modele, source: `${cv?.nom ?? id} (CV fictif)` });
    } catch {
      setErreurFictif("La fiche de ce CV fictif n'a pas pu être chargée. Réessayez.");
    } finally {
      setChargement(null);
    }
  }

  const etapeEnCours = !affichee ? 0 : !validee ? 1 : 2;

  return (
    <>
      <Etapes enCours={etapeEnCours} terminees={[affichee !== null, validee, compare]} />

      {affichee && !choixOuvert ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">CV :</span> <strong className="font-semibold">{affichee.source}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setChoixOuvert(true)}
            className="font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-300"
          >
            Changer de CV
          </button>
        </p>
      ) : (
        <>
          <DepotCV
            surFiche={(resultat, nomFichier) =>
              afficher({ fiche: resultat.fiche, aVerifier: resultat.aVerifier, modele: resultat.modele, source: nomFichier })
            }
          />
          <ListeCVFictifs disponibles={disponibles} surChoix={(id) => void choisirFictif(id)} enChargement={chargement} />
          {erreurFictif && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {erreurFictif}
            </p>
          )}
          {affichee && (
            <button
              type="button"
              onClick={() => setChoixOuvert(false)}
              className="self-start text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-300"
            >
              Garder le CV actuel ({affichee.source})
            </button>
          )}
        </>
      )}

      {affichee && (
        <FicheEditable
          key={affichee.numero}
          fiche={affichee.fiche}
          aVerifier={affichee.aVerifier}
          modele={affichee.modele}
          source={affichee.source}
          criteresExemple={criteresExemple}
          surValidation={(v) => {
            setValidee(v !== null);
            if (v === null) setCompare(false);
          }}
          surComparaison={() => setCompare(true)}
        />
      )}
    </>
  );
}
