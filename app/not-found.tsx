/**
 * Page 404, en français : remplace la page anglaise par défaut de Next.js
 * (« 404: This page could not be found. »), avec le style de l'accueil et un lien pour y revenir.
 */
import type { Metadata } from "next";
import Link from "next/link";

// Titre de l'onglet : fusionné par Next.js avec les métadonnées du layout, il remplace « CV Reader »
// (une balise <title> écrite dans la page s'y ajoutait au lieu de le remplacer).
export const metadata: Metadata = {
  title: "Page introuvable · CV Reader",
};

export default function PageIntrouvable() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Erreur 404</p>
        <h1 className="text-4xl font-semibold tracking-tight">Page introuvable</h1>
        <p className="text-base leading-7 text-zinc-600 dark:text-zinc-300">
          Cette adresse ne correspond à aucune page de CV Reader. Le lecteur de CV se trouve sur la page d&apos;accueil.
        </p>
        <Link
          href="/"
          className="self-start rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Revenir à l&apos;accueil
        </Link>
      </main>
    </div>
  );
}
