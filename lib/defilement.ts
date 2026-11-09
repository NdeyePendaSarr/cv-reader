/**
 * Amène une section à l'écran et y place le focus clavier, pour que chaque étape du parcours
 * soit visible sans défiler soi-même, et annoncée par les lecteurs d'écran.
 *
 * Défilement « smooth », sauf si la personne a demandé moins d'animations
 * (prefers-reduced-motion : reduce) : il devient alors immédiat (« auto »).
 * L'élément visé doit pouvoir recevoir le focus (titre avec tabIndex={-1}).
 */

/** Vrai si le système demande de réduire les animations. */
export function mouvementReduit(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/** Fait défiler jusqu'à l'élément, puis lui donne le focus sans second défilement. */
export function amenerA(element: HTMLElement | null): void {
  if (!element) return;
  // scrollIntoView peut manquer hors d'un vrai navigateur (jsdom) : le focus suffit alors.
  element.scrollIntoView?.({ behavior: mouvementReduit() ? "auto" : "smooth", block: "start" });
  element.focus({ preventScroll: true });
}
