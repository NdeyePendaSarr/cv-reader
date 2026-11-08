"use client";

/**
 * Zone de dépôt d'un CV : glisser-déposer ou bouton « Choisir un PDF ».
 * Le type et la taille sont contrôlés dans le navigateur avant l'envoi
 * (par envoyerCV), puis le serveur refait ses propres contrôles.
 */
import { useId, useRef, useState, type DragEvent } from "react";
import { envoyerCV } from "@/lib/api-client";

type Etat =
  | { type: "attente" }
  | { type: "envoi"; nomFichier: string }
  | { type: "erreur"; nomFichier: string; message: string }
  | { type: "info"; nomFichier: string; message: string };

export default function DepotCV() {
  const [etat, setEtat] = useState<Etat>({ type: "attente" });
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const idAide = useId();
  const enCours = etat.type === "envoi";

  async function traiter(fichier: File) {
    setEtat({ type: "envoi", nomFichier: fichier.name });
    const resultat = await envoyerCV(fichier);
    if (resultat.ok) {
      // Cas atteint à partir de T2 seulement.
      setEtat({ type: "info", nomFichier: fichier.name, message: "Extraction terminée." });
    } else if (resultat.code === "EXTRACTION_PAS_ENCORE_DISPONIBLE") {
      setEtat({ type: "info", nomFichier: fichier.name, message: resultat.message });
    } else {
      setEtat({ type: "erreur", nomFichier: fichier.name, message: resultat.message });
    }
  }

  function surDepot(evenement: DragEvent<HTMLDivElement>) {
    evenement.preventDefault();
    setSurvol(false);
    if (enCours) return;
    const fichiers = evenement.dataTransfer.files;
    if (fichiers.length > 1) {
      setEtat({
        type: "erreur",
        nomFichier: `${fichiers.length} fichiers`,
        message: "Déposez un seul CV à la fois.",
      });
      return;
    }
    if (fichiers[0]) void traiter(fichiers[0]);
  }

  return (
    <section aria-labelledby="titre-depot" className="flex flex-col gap-4">
      <h2 id="titre-depot" className="text-lg font-semibold">
        Déposer un CV
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!enCours) setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={surDepot}
        aria-busy={enCours}
        className={[
          "flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          survol
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
        ].join(" ")}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="text-base">
          Glissez votre PDF ici, ou
        </p>
        <button
          type="button"
          onClick={() => champ.current?.click()}
          disabled={enCours}
          aria-describedby={idAide}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enCours ? "Envoi en cours…" : "Choisir un PDF"}
        </button>
        <p id={idAide} className="text-sm text-zinc-500 dark:text-zinc-400">
          PDF uniquement, 4 Mo et 5 pages au plus. Le fichier n&apos;est conservé nulle part.
        </p>
        <input
          ref={champ}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            e.target.value = ""; // permet de rechoisir le même fichier
            if (fichier) void traiter(fichier);
          }}
        />
      </div>

      {/* Zone d'état, annoncée aux lecteurs d'écran. */}
      <div aria-live="polite" className="min-h-6">
        {etat.type === "envoi" && (
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
            Vérification de « {etat.nomFichier} »…
          </p>
        )}
        {etat.type === "erreur" && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100">
            <p className="font-semibold">Fichier refusé : {etat.nomFichier}</p>
            <p>{etat.message}</p>
          </div>
        )}
        {etat.type === "info" && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p className="font-semibold">Fichier accepté : {etat.nomFichier}</p>
            <p>{etat.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}
