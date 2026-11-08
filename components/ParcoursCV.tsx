"use client";

/**
 * Parcours de la page d'accueil : dépôt d'un PDF ou choix d'un CV fictif, puis fiche à valider.
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

export default function ParcoursCV({ disponibles }: { disponibles: readonly string[] }) {
  const [affichee, setAffichee] = useState<FicheAffichee | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreurFictif, setErreurFictif] = useState<string | null>(null);
  const numero = useRef(0);

  function afficher(fiche: Omit<FicheAffichee, "numero">) {
    numero.current += 1;
    setAffichee({ ...fiche, numero: numero.current });
  }

  async function choisirFictif(id: string) {
    const cv = CV_FICTIFS.find((c) => c.id === id);
    setErreurFictif(null);
    setChargement(true);
    try {
      const reponse = await fetch(`/samples/${id}.json`);
      const reference = FicheReferenceSchema.safeParse(await reponse.json());
      if (!reponse.ok || !reference.success) throw new Error("fiche de référence illisible");
      const { fiche, aVerifier, modele } = reference.data;
      afficher({ fiche, aVerifier, modele, source: `${cv?.nom ?? id} (CV fictif)` });
    } catch {
      setErreurFictif("La fiche de ce CV fictif n'a pas pu être chargée. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <DepotCV
        surFiche={(resultat, nomFichier) =>
          afficher({ fiche: resultat.fiche, aVerifier: resultat.aVerifier, modele: resultat.modele, source: nomFichier })
        }
      />
      <ListeCVFictifs disponibles={disponibles} surChoix={(id) => void choisirFictif(id)} enCours={chargement} />
      {erreurFictif && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {erreurFictif}
        </p>
      )}
      {affichee && (
        <FicheEditable
          key={affichee.numero}
          fiche={affichee.fiche}
          aVerifier={affichee.aVerifier}
          modele={affichee.modele}
          source={affichee.source}
        />
      )}
    </>
  );
}
