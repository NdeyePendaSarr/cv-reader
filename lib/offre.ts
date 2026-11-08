/**
 * Critères d'une offre au format Markdown de samples/offre.md : une liste numérotée
 * (« 1. Pratique de React »). Seules les lignes de la liste sont des critères.
 */

/** Extrait les critères d'une liste Markdown numérotée ou à puces, dans l'ordre. */
export function extraireCriteres(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((ligne) => /^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/.exec(ligne)?.[1])
    .filter((critere): critere is string => critere !== undefined && critere !== "");
}

/** Critères saisis dans la zone de texte : un par ligne, lignes vides ignorées. */
export function criteresSaisis(texte: string): string[] {
  return texte
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== "");
}
