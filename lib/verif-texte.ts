/**
 * Vérification de la fiche contre le texte du PDF (docs/SPEC.md, « Vérification contre le texte du PDF »).
 *
 * Zod contrôle la forme, pas la vérité : chaque valeur courte recopiée par le modèle
 * est cherchée dans le texte du CV. Une valeur introuvable n'est pas supprimée :
 * son chemin (ex. « contact.telephone », « experiences.0.entreprise ») va dans `aVerifier`,
 * et l'écran de validation la signale.
 *
 * Les `description` ne sont jamais vérifiées : longues et étalées sur plusieurs lignes,
 * elles seraient presque toujours signalées pour rien.
 */
import type { FicheCV } from "@/lib/schemas";

/** Normalisation commune : Unicode NFKC, minuscules, espaces et retours à la ligne fusionnés. */
export function normaliser(texte: string): string {
  return texte.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Chiffres seuls (pour les téléphones). */
export function chiffres(texte: string): string {
  return texte.replace(/\D/g, "");
}

/** Adresse web sans `http://`, `https://`, `www.` ni barre oblique finale. */
export function normaliserUrl(texte: string): string {
  return normaliser(texte)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

type Comparaison = "texte" | "telephone" | "url";

/** Une valeur courte de la fiche, avec son chemin et la règle de comparaison à appliquer. */
interface ValeurCourte {
  chemin: string;
  valeur: string | null;
  regle: Comparaison;
}

/** Liste les champs courts de la fiche (identité, contact, compétences, langues, parcours). */
export function valeursCourtes(fiche: FicheCV): ValeurCourte[] {
  const v: ValeurCourte[] = [];
  const ajouter = (chemin: string, valeur: string | null, regle: Comparaison = "texte") =>
    v.push({ chemin, valeur, regle });

  for (const [cle, valeur] of Object.entries(fiche.identite)) ajouter(`identite.${cle}`, valeur);
  ajouter("contact.email", fiche.contact.email);
  ajouter("contact.telephone", fiche.contact.telephone, "telephone");
  ajouter("contact.linkedin", fiche.contact.linkedin, "url");
  ajouter("contact.github", fiche.contact.github, "url");
  ajouter("contact.siteWeb", fiche.contact.siteWeb, "url");
  fiche.competences.forEach((c, i) => ajouter(`competences.${i}`, c));
  fiche.experiences.forEach((e, i) => {
    // La description est volontairement absente : elle n'est jamais vérifiée.
    for (const cle of ["poste", "entreprise", "lieu", "debut", "fin"] as const) {
      ajouter(`experiences.${i}.${cle}`, e[cle]);
    }
  });
  fiche.formations.forEach((f, i) => {
    for (const cle of ["diplome", "etablissement", "debut", "fin"] as const) {
      ajouter(`formations.${i}.${cle}`, f[cle]);
    }
  });
  fiche.langues.forEach((l, i) => {
    ajouter(`langues.${i}.langue`, l.langue);
    ajouter(`langues.${i}.niveau`, l.niveau);
  });
  return v;
}

/** Vrai si la valeur est retrouvée dans le texte, selon sa règle. */
function estRetrouvee(valeur: string, regle: Comparaison, texte: string, chiffresDuTexte: string): boolean {
  switch (regle) {
    case "telephone": {
      // Les chiffres de la fiche doivent se trouver dans ceux du CV : un indicatif retiré
      // par le modèle reste retrouvé, un indicatif ajouté est marqué « à vérifier ».
      const c = chiffres(valeur);
      return c.length > 0 && chiffresDuTexte.includes(c);
    }
    case "url": {
      const u = normaliserUrl(valeur);
      return u.length > 0 && texte.includes(u);
    }
    case "texte":
      return texte.includes(normaliser(valeur));
  }
}

/**
 * Renvoie les chemins des valeurs courtes introuvables dans le texte du CV.
 * PDF sans texte (scanné) : toutes les valeurs courtes remplies sont à vérifier.
 * Les valeurs nulles ne sont jamais à vérifier : elles sont déjà signalées « non trouvé ».
 */
export function cheminsAVerifier(fiche: FicheCV, texteDuCV: string): string[] {
  const texte = normaliser(texteDuCV);
  const chiffresDuTexte = chiffres(texteDuCV);
  return valeursCourtes(fiche)
    .filter((v): v is ValeurCourte & { valeur: string } => v.valeur !== null)
    .filter((v) => texte === "" || !estRetrouvee(v.valeur, v.regle, texte, chiffresDuTexte))
    .map((v) => v.chemin);
}
