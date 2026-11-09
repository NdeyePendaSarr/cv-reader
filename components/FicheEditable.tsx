"use client";

/**
 * Validation humaine (tranche T3) : la fiche extraite (ou celle d'un CV fictif) devient un
 * formulaire pré-rempli. Chaque champ est modifiable, les listes acceptent ajout, modification
 * et suppression. Les badges « non trouvé » et « à vérifier » restent visibles ; « Confirmer »
 * retire un « à vérifier ».
 *
 * « Valider la fiche » contrôle le formulaire avec FicheCVSchema, demande confirmation s'il reste
 * des valeurs à vérifier, puis seulement rend la fiche téléchargeable en JSON (FicheValideeSchema).
 * Le fichier est créé dans le navigateur : aucun appel réseau, rien n'est stocké.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ComparaisonOffre from "@/components/ComparaisonOffre";
import DialogueAVerifier from "@/components/DialogueAVerifier";
import { amenerA } from "@/lib/defilement";
import {
  champsAVerifierRestants,
  construireFicheValidee,
  depuisFiche,
  listerChamps,
  nomFichier,
  validerEdition,
  type Element,
  type FicheEnEdition,
} from "@/lib/edition";
import type { FicheCV, FicheValidee } from "@/lib/schemas";

/** Identifiant HTML d'un champ, à partir de sa clé de formulaire. */
export function idChamp(cle: string): string {
  return `champ-${cle.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

// ---------------------------------------------------------------------------
// Petits composants d'affichage.
// ---------------------------------------------------------------------------

function BadgeNonTrouve() {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      non trouvé
    </span>
  );
}

function BadgeAVerifier() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-700">
      à vérifier
    </span>
  );
}

const classeBoutonSecondaire =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-700 dark:hover:bg-zinc-800";

interface ProprietesChamp {
  cle: string;
  libelle: string;
  valeur: string | null;
  /** Champ facultatif : vidé, il redevient null. Obligatoire (compétence, langue) : reste une chaîne. */
  facultatif: boolean;
  surChangement: (valeur: string | null) => void;
  aVerifier: boolean;
  surConfirmation: () => void;
  erreur?: string;
  multiligne?: boolean;
  type?: "text" | "email";
}

/** Un champ du formulaire : étiquette, saisie, badges, bouton « Confirmer », message d'erreur. */
function ChampTexte({
  cle,
  libelle,
  valeur,
  facultatif,
  surChangement,
  aVerifier,
  surConfirmation,
  erreur,
  multiligne,
  type = "text",
}: ProprietesChamp) {
  const id = idChamp(cle);
  const idErreur = `${id}-erreur`;
  const vide = valeur === null || valeur.trim() === "";
  const proprietes = {
    id,
    value: valeur ?? "",
    "aria-invalid": erreur ? true : undefined,
    "aria-describedby": erreur ? idErreur : undefined,
    onChange: (e: { target: { value: string } }) => {
      const saisie = e.target.value;
      surChangement(facultatif && saisie.trim() === "" ? null : saisie);
    },
    className: [
      "w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-zinc-950",
      erreur ? "border-red-500" : aVerifier ? "border-amber-400" : "border-zinc-300 dark:border-zinc-700",
      "focus-visible:outline-2 focus-visible:outline-indigo-600",
    ].join(" "),
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {libelle}
        </label>
        {vide && facultatif && <BadgeNonTrouve />}
        {aVerifier && <BadgeAVerifier />}
        {aVerifier && (
          <button type="button" onClick={surConfirmation} className={classeBoutonSecondaire} aria-label={`Confirmer : ${libelle}`}>
            Confirmer
          </button>
        )}
      </div>
      {multiligne ? <textarea rows={3} {...proprietes} /> : <input type={type} {...proprietes} />}
      {erreur && (
        <p id={idErreur} className="text-sm text-red-700 dark:text-red-300">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Section repliable : ouverte ou non, et ce qu'on montre à côté du titre quand elle est fermée. */
interface Repli {
  ouvert: boolean;
  surBascule: (ouvert: boolean) => void;
  resume: string;
}

function Section({ titre, children, action, repli }: { titre: string; children: ReactNode; action?: ReactNode; repli?: Repli }) {
  if (!repli) {
    return (
      <fieldset className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{titre}</legend>
        {children}
        {action}
      </fieldset>
    );
  }
  // Sections longues (compétences, expériences, formations) : <details> natif, ouvrable au clavier.
  return (
    <details
      open={repli.ouvert}
      onToggle={(e) => repli.surBascule(e.currentTarget.open)}
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-zinc-400">
        {titre} <span className="font-normal normal-case">· {repli.resume}</span>
      </summary>
      <fieldset className="mt-3 flex flex-col gap-3">
        <legend className="sr-only">{titre}</legend>
        {children}
        {action}
      </fieldset>
    </details>
  );
}

/** Section de la fiche à laquelle appartient une clé de champ (« competences@o2 » → « competences »). */
function sectionDe(cle: string): string {
  return cle.split(/[@.]/)[0]!;
}

// ---------------------------------------------------------------------------
// Formulaire.
// ---------------------------------------------------------------------------

const LIBELLES_IDENTITE: Record<keyof FicheCV["identite"], string> = {
  nomComplet: "Nom complet",
  titre: "Titre",
  ville: "Ville",
  pays: "Pays",
};
const LIBELLES_CONTACT: Record<keyof FicheCV["contact"], string> = {
  email: "E-mail",
  telephone: "Téléphone",
  linkedin: "LinkedIn",
  github: "GitHub",
  siteWeb: "Site web",
};
/** Expériences ou formations d'une fiche en édition, vues comme des listes d'objets texte. */
function elementsDe(edition: FicheEnEdition, nom: "experiences" | "formations"): Element<Record<string, string | null>>[] {
  return edition[nom] as Element<Record<string, string | null>>[];
}

const LIBELLES_EXPERIENCE ={ poste: "Poste", entreprise: "Entreprise", lieu: "Lieu", debut: "Début", fin: "Fin", description: "Description" } as const;
const LIBELLES_FORMATION = { diplome: "Diplôme", etablissement: "Établissement", debut: "Début", fin: "Fin" } as const;

export default function FicheEditable({
  fiche,
  aVerifier,
  modele,
  source,
  criteresExemple = [],
  surValidation,
  surComparaison,
}: {
  /** Fiche extraite, telle que reçue : sert de référence pour compter les corrections. */
  fiche: FicheCV;
  aVerifier: string[];
  modele: string;
  source: string;
  /** Critères de samples/offre.md, proposés par « Utiliser les critères d'exemple ». */
  criteresExemple?: readonly string[];
  /** Prévient le parcours quand la fiche est validée (ou que la validation est annulée). */
  surValidation?: (validee: FicheValidee | null) => void;
  /** Prévient le parcours quand une comparaison a donné des résultats. */
  surComparaison?: () => void;
}) {
  const [edition, setEdition] = useState<FicheEnEdition>(() => depuisFiche(fiche));
  const [confirmes, setConfirmes] = useState<ReadonlySet<string>>(new Set());
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [dialogue, setDialogue] = useState(false);
  const [validee, setValideeLocale] = useState<FicheValidee | null>(null);
  /** Sections repliables ouvertes ou fermées à la main ; sinon, ouvertes s'il y reste un « à vérifier ». */
  const [ouvertures, setOuvertures] = useState<Record<string, boolean>>({});
  const focusCible = useRef<string | null>(null);
  const compteur = useRef(0);
  const titre = useRef<HTMLHeadingElement>(null);

  /** Valide ou annule la validation, et prévient le parcours (étapes, repli du choix du CV). */
  function setValidee(v: FicheValidee | null) {
    setValideeLocale(v);
    surValidation?.(v);
  }

  // Fiche chargée (PDF ou CV fictif) : on l'amène à l'écran, focus sur son titre.
  useEffect(() => {
    amenerA(titre.current);
  }, []);

  const champs = useMemo(() => listerChamps(edition), [edition]);
  const restants = useMemo(
    () => champsAVerifierRestants(edition, fiche, aVerifier, confirmes),
    [edition, fiche, aVerifier, confirmes],
  );
  const clesAVerifier = useMemo(() => new Set(restants.map((c) => c.cle)), [restants]);
  const origineDe = useMemo(() => new Map(champs.map((c) => [c.cle, c.origine])), [champs]);

  // Le focus est déplacé après le rendu qui suit une demande (champ en erreur, champ à vérifier,
  // élément ajouté…). Chaque demande accompagne un changement d'état, donc un nouveau rendu.
  useEffect(() => {
    if (focusCible.current === null) return;
    const element = document.getElementById(focusCible.current);
    // Le titre de la fiche (« Modifier la fiche ») est amené à l'écran ; un champ reçoit seulement le focus.
    if (focusCible.current === "titre-fiche") amenerA(element);
    else element?.focus();
    focusCible.current = null;
  });

  /** Ouverte si on l'a ouverte à la main, ou s'il y reste un « à vérifier » ; toujours ouverte s'il y a une erreur. */
  function sectionOuverte(nom: string): boolean {
    const prefixe = `${nom}@`;
    const aVerif = [...clesAVerifier].some((k) => k.startsWith(prefixe));
    const erreur = Object.keys(erreurs).some((k) => k.startsWith(prefixe));
    return erreur || (ouvertures[nom] ?? aVerif);
  }

  function repli(nom: string, resume: string): Repli {
    return {
      ouvert: sectionOuverte(nom),
      surBascule: (ouvert) => setOuvertures((avant) => (avant[nom] === ouvert ? avant : { ...avant, [nom]: ouvert })),
      resume,
    };
  }

  /** Demande que le focus aille sur cet élément après le prochain rendu. */
  function setFocusCible(id: string | null) {
    focusCible.current = id;
  }

  /** Toute modification annule une validation déjà faite : le fichier doit refléter la fiche finale. */
  function modifier(changer: (brouillon: FicheEnEdition) => void, cleChamp?: string) {
    setEdition((precedente) => {
      const brouillon = structuredClone(precedente);
      changer(brouillon);
      return brouillon;
    });
    setValidee(null);
    if (cleChamp && erreurs[cleChamp]) {
      // L'erreur d'un champ disparaît dès qu'on le modifie ; elle sera recalculée à la prochaine validation.
      setErreurs((avant) => Object.fromEntries(Object.entries(avant).filter(([cle]) => cle !== cleChamp)));
    }
  }

  function confirmer(cle: string) {
    const origine = origineDe.get(cle);
    if (!origine) return;
    setConfirmes((avant) => new Set(avant).add(origine));
    setValidee(null);
    setFocusCible(idChamp(cle)); // le bouton disparaît : le focus revient sur le champ
  }

  function nouvelleCle() {
    compteur.current += 1;
    return `n${compteur.current}`;
  }

  /** Propriétés communes d'un champ, à partir de sa clé. */
  function etat(cle: string) {
    return { cle, aVerifier: clesAVerifier.has(cle), surConfirmation: () => confirmer(cle), erreur: erreurs[cle] };
  }

  function valider() {
    const resultat = validerEdition(edition);
    if (!resultat.ok) {
      setErreurs(resultat.erreurs);
      const premier = champs.find((c) => resultat.erreurs[c.cle]);
      if (premier) setFocusCible(idChamp(premier.cle));
      return;
    }
    setErreurs({});
    if (restants.length > 0) {
      setDialogue(true);
      return;
    }
    finaliser();
  }

  function finaliser() {
    setDialogue(false);
    // La fiche se replie en résumé ; la zone de comparaison s'amène elle-même à l'écran.
    setValidee(construireFicheValidee({ originale: fiche, edition, modele, aVerifier, confirmes }));
  }

  function revenirVerifier() {
    setDialogue(false);
    const premier = restants[0];
    if (premier) setOuvertures((avant) => ({ ...avant, [sectionDe(premier.cle)]: true }));
    setFocusCible(premier ? idChamp(premier.cle) : null);
  }

  /** « Modifier la fiche » : la validation est annulée (règle existante), le formulaire se rouvre. */
  function rouvrir() {
    setValidee(null);
    setFocusCible("titre-fiche");
  }

  function telecharger() {
    if (!validee) return;
    // Le fichier est créé en mémoire dans le navigateur : aucun appel réseau, rien n'est stocké.
    const blob = new Blob([JSON.stringify(validee, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nomFichier(validee.fiche.identite.nomComplet, new Date(validee.valideeLe));
    document.body.append(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
  }

  /** Bouton « Supprimer » d'un élément de liste. */
  function boutonSupprimer(libelle: string, retirer: () => void) {
    return (
      <button type="button" onClick={retirer} className={classeBoutonSecondaire} aria-label={`Supprimer : ${libelle}`}>
        Supprimer
      </button>
    );
  }

  /** Bouton « Ajouter … » d'une liste ; le focus va sur le premier champ du nouvel élément. */
  function boutonAjouter(texte: string, ajouter: (cle: string) => string) {
    return (
      <button
        type="button"
        onClick={() => {
          const cle = nouvelleCle();
          const cleChamp = ajouter(cle);
          setFocusCible(idChamp(cleChamp));
        }}
        className={`${classeBoutonSecondaire} self-start`}
      >
        {texte}
      </button>
    );
  }

  /** Expériences et formations : un groupe de champs par élément. */
  function listeObjets<T extends Record<string, string | null>>(
    nom: "experiences" | "formations",
    singulier: string,
    libelles: Record<keyof T & string, string>,
    elements: Element<T>[],
    vide: T,
  ) {
    return (
      <>
        {elements.length === 0 && (
          <p className="text-sm text-zinc-500">
            <BadgeNonTrouve /> Aucun élément.
          </p>
        )}
        {elements.map((element, i) => (
          <fieldset key={element.cle} className="flex flex-col gap-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
            <legend className="sr-only">
              {singulier} {i + 1}
            </legend>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" aria-hidden="true">
                {singulier} {i + 1}
              </span>
              {boutonSupprimer(`${singulier} ${i + 1}`, () =>
                modifier((b) => {
                  const liste = elementsDe(b, nom);
                  liste.splice(liste.findIndex((e) => e.cle === element.cle), 1);
                }),
              )}
            </div>
            {(Object.keys(libelles) as (keyof T & string)[]).map((champ) => {
              const cle = `${nom}@${element.cle}.${champ}`;
              return (
                <ChampTexte
                  key={cle}
                  {...etat(cle)}
                  libelle={`${libelles[champ]} (${singulier.toLowerCase()} ${i + 1})`}
                  valeur={element.valeur[champ] ?? null}
                  facultatif
                  multiligne={champ === "description"}
                  surChangement={(v) =>
                    modifier((b) => {
                      const cible = elementsDe(b, nom).find((e) => e.cle === element.cle);
                      if (cible) cible.valeur[champ] = v;
                    }, cle)
                  }
                />
              );
            })}
          </fieldset>
        ))}
        {boutonAjouter(`Ajouter une ${singulier.toLowerCase()}`, (cleElement) => {
          modifier((b) => {
            elementsDe(b, nom).push({ cle: cleElement, origine: null, valeur: { ...vide } });
          });
          return `${nom}@${cleElement}.${Object.keys(libelles)[0]}`;
        })}
      </>
    );
  }

  const nbErreurs = Object.keys(erreurs).length;

  return (
    <article aria-labelledby="titre-fiche" className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-2">
        {/* tabIndex -1 : le titre reçoit le focus quand la fiche arrive à l'écran (lecteurs d'écran). */}
        <h2 id="titre-fiche" ref={titre} tabIndex={-1} className="scroll-mt-4 text-lg font-semibold focus:outline-none">
          {validee ? "Fiche validée" : "Fiche à valider"} : {source}
        </h2>
        {!validee && (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Vérifiez et corrigez chaque champ, puis validez. Un champ vidé est enregistré comme « non trouvé ».{" "}
              {restants.length} valeur{restants.length > 1 ? "s" : ""} encore à vérifier.
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <BadgeAVerifier /> valeur introuvable dans le texte du PDF · <BadgeNonTrouve /> absente du CV · modèle : {modele}
            </p>
          </>
        )}
      </header>

      {validee ? (
        // Fiche validée : repliée en résumé ; « Modifier la fiche » la rouvre et annule la validation.
        <section aria-label="Résumé de la fiche validée" className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-zinc-500 dark:text-zinc-400">Nom</dt>
            <dd>{validee.fiche.identite.nomComplet ?? "non trouvé"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Titre</dt>
            <dd>{validee.fiche.identite.titre ?? "non trouvé"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Champs corrigés</dt>
            <dd>{validee.champsCorriges}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Valeurs non vérifiées</dt>
            <dd>{validee.nonVerifiees.length}</dd>
          </dl>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Le fichier est créé dans votre navigateur ; rien n&apos;est envoyé ni conservé.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              id="bouton-telecharger"
              type="button"
              onClick={telecharger}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Télécharger la fiche (JSON)
            </button>
            <button
              type="button"
              onClick={rouvrir}
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Modifier la fiche
            </button>
          </div>
        </section>
      ) : (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          valider();
        }}
        className="flex flex-col gap-6"
      >
        <Section titre="Identité">
          {(Object.keys(LIBELLES_IDENTITE) as (keyof FicheCV["identite"])[]).map((k) => (
            <ChampTexte
              key={k}
              {...etat(`identite.${k}`)}
              libelle={LIBELLES_IDENTITE[k]}
              valeur={edition.identite[k]}
              facultatif
              surChangement={(v) => modifier((b) => void (b.identite[k] = v), `identite.${k}`)}
            />
          ))}
        </Section>

        <Section titre="Contact">
          {(Object.keys(LIBELLES_CONTACT) as (keyof FicheCV["contact"])[]).map((k) => (
            <ChampTexte
              key={k}
              {...etat(`contact.${k}`)}
              libelle={LIBELLES_CONTACT[k]}
              valeur={edition.contact[k]}
              facultatif
              type={k === "email" ? "email" : "text"}
              surChangement={(v) => modifier((b) => void (b.contact[k] = v), `contact.${k}`)}
            />
          ))}
        </Section>

        <Section
          titre="Compétences"
          repli={repli("competences", `${edition.competences.length} compétence${edition.competences.length > 1 ? "s" : ""}`)}
          action={boutonAjouter("Ajouter une compétence", (cleElement) => {
            modifier((b) => void b.competences.push({ cle: cleElement, origine: null, valeur: "" }));
            return `competences@${cleElement}`;
          })}
        >
          {edition.competences.length === 0 && (
            <p className="text-sm text-zinc-500">
              <BadgeNonTrouve /> Aucune compétence.
            </p>
          )}
          {edition.competences.map((element, i) => {
            const cle = `competences@${element.cle}`;
            return (
              <div key={element.cle} className="flex items-end gap-2">
                <div className="flex-1">
                  <ChampTexte
                    {...etat(cle)}
                    libelle={`Compétence ${i + 1}`}
                    valeur={element.valeur}
                    facultatif={false}
                    surChangement={(v) =>
                      modifier((b) => {
                        const cible = b.competences.find((e) => e.cle === element.cle);
                        if (cible) cible.valeur = v ?? "";
                      }, cle)
                    }
                  />
                </div>
                <div className="pb-1.5">
                  {boutonSupprimer(`compétence ${i + 1}`, () =>
                    modifier((b) => void (b.competences = b.competences.filter((e) => e.cle !== element.cle))),
                  )}
                </div>
              </div>
            );
          })}
        </Section>

        <Section titre="Expériences" repli={repli("experiences", `${edition.experiences.length} expérience${edition.experiences.length > 1 ? "s" : ""}`)}>
          {listeObjets("experiences", "Expérience", LIBELLES_EXPERIENCE, edition.experiences, {
            poste: null,
            entreprise: null,
            lieu: null,
            debut: null,
            fin: null,
            description: null,
          })}
        </Section>

        <Section titre="Formations" repli={repli("formations", `${edition.formations.length} formation${edition.formations.length > 1 ? "s" : ""}`)}>
          {listeObjets("formations", "Formation", LIBELLES_FORMATION, edition.formations, {
            diplome: null,
            etablissement: null,
            debut: null,
            fin: null,
          })}
        </Section>

        <Section
          titre="Langues"
          action={boutonAjouter("Ajouter une langue", (cleElement) => {
            modifier((b) => void b.langues.push({ cle: cleElement, origine: null, valeur: { langue: "", niveau: null } }));
            return `langues@${cleElement}.langue`;
          })}
        >
          {edition.langues.length === 0 && (
            <p className="text-sm text-zinc-500">
              <BadgeNonTrouve /> Aucune langue.
            </p>
          )}
          {edition.langues.map((element, i) => (
            <fieldset key={element.cle} className="flex flex-col gap-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
              <legend className="sr-only">Langue {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChampTexte
                  {...etat(`langues@${element.cle}.langue`)}
                  libelle={`Langue ${i + 1}`}
                  valeur={element.valeur.langue}
                  facultatif={false}
                  surChangement={(v) =>
                    modifier((b) => {
                      const cible = b.langues.find((e) => e.cle === element.cle);
                      if (cible) cible.valeur.langue = v ?? "";
                    }, `langues@${element.cle}.langue`)
                  }
                />
                <ChampTexte
                  {...etat(`langues@${element.cle}.niveau`)}
                  libelle={`Niveau (langue ${i + 1})`}
                  valeur={element.valeur.niveau}
                  facultatif
                  surChangement={(v) =>
                    modifier((b) => {
                      const cible = b.langues.find((e) => e.cle === element.cle);
                      if (cible) cible.valeur.niveau = v;
                    }, `langues@${element.cle}.niveau`)
                  }
                />
              </div>
              <div>
                {boutonSupprimer(`langue ${i + 1}`, () =>
                  modifier((b) => void (b.langues = b.langues.filter((e) => e.cle !== element.cle))),
                )}
              </div>
            </fieldset>
          ))}
        </Section>

        <Section titre="Langue du CV">
          <div className="flex flex-col gap-1">
            <label htmlFor={idChamp("langueDuCV")} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Langue dans laquelle le CV est rédigé
            </label>
            <select
              id={idChamp("langueDuCV")}
              value={edition.langueDuCV}
              onChange={(e) => modifier((b) => void (b.langueDuCV = e.target.value as FicheCV["langueDuCV"]))}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </Section>

        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div aria-live="polite">
            {nbErreurs > 0 && (
              <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
                {nbErreurs} champ{nbErreurs > 1 ? "s" : ""} à corriger avant de valider.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Valider la fiche
            </button>
            <button
              type="button"
              disabled
              aria-describedby="aide-telecharger"
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Télécharger la fiche (JSON)
            </button>
          </div>
          <p id="aide-telecharger" className="text-xs text-zinc-500 dark:text-zinc-400">
            Le téléchargement devient possible après la validation.
          </p>
        </div>
      </form>
      )}

      {/* La comparaison n'est possible qu'après la validation, et part de la fiche validée. */}
      {validee ? (
        <ComparaisonOffre key={validee.valideeLe} fiche={validee.fiche} criteresExemple={criteresExemple} surResultats={surComparaison} />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          La comparaison avec une offre devient possible après la validation de la fiche.
        </p>
      )}

      {dialogue && <DialogueAVerifier nombre={restants.length} surRevenir={revenirVerifier} surValider={finaliser} />}
    </article>
  );
}
