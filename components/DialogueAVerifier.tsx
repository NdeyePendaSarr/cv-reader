"use client";

/**
 * Boîte de dialogue de l'application (jamais alert() ni confirm()) : il reste des valeurs
 * « à vérifier » non confirmées au moment de valider.
 *
 * Accessibilité : rôle dialog modal, titre et description reliés, focus placé sur
 * « Revenir vérifier » à l'ouverture, Tab et Maj+Tab restent dans la boîte, Échap = revenir.
 */
import { useEffect, useRef, type KeyboardEvent } from "react";

export default function DialogueAVerifier({
  nombre,
  surRevenir,
  surValider,
}: {
  nombre: number;
  surRevenir: () => void;
  surValider: () => void;
}) {
  const revenir = useRef<HTMLButtonElement>(null);
  const valider = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    revenir.current?.focus();
  }, []);

  function surTouche(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key === "Escape") {
      evenement.preventDefault();
      surRevenir();
      return;
    }
    if (evenement.key === "Tab") {
      // Deux boutons seulement : le focus passe de l'un à l'autre sans sortir de la boîte.
      evenement.preventDefault();
      (document.activeElement === revenir.current ? valider : revenir).current?.focus();
    }
  }

  const pluriel = nombre > 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-dialogue-a-verifier"
        aria-describedby="texte-dialogue-a-verifier"
        onKeyDown={surTouche}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
      >
        <h2 id="titre-dialogue-a-verifier" className="text-lg font-semibold">
          {nombre} valeur{pluriel ? "s" : ""} encore à vérifier
        </h2>
        <p id="texte-dialogue-a-verifier" className="text-sm text-zinc-600 dark:text-zinc-300">
          {pluriel ? "Ces valeurs n'ont pas été retrouvées" : "Cette valeur n'a pas été retrouvée"} dans le texte du PDF,
          et {pluriel ? "vous ne les avez ni confirmées ni corrigées" : "vous ne l'avez ni confirmée ni corrigée"}.
          Vous pouvez revenir les vérifier, ou valider la fiche telle quelle.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            ref={revenir}
            type="button"
            onClick={surRevenir}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Revenir vérifier
          </button>
          <button
            ref={valider}
            type="button"
            onClick={surValider}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Valider quand même
          </button>
        </div>
      </div>
    </div>
  );
}
