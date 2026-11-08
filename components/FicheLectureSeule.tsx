/**
 * Fiche extraite, en lecture seule (T3 la rendra modifiable).
 *
 * Deux signalements distincts :
 * - « non trouvé » : le modèle n'a rien trouvé (null ou liste vide) ;
 * - « à vérifier » : la valeur n'a pas été retrouvée dans le texte du PDF.
 */
import type { ReactNode } from "react";
import type { FicheCV } from "@/lib/schemas";

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

/** Une valeur avec son éventuel signalement. */
function Valeur({ valeur, chemin, aVerifier }: { valeur: string | null; chemin: string; aVerifier: Set<string> }) {
  if (valeur === null) return <BadgeNonTrouve />;
  const douteuse = aVerifier.has(chemin);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={douteuse ? "rounded bg-amber-50 px-1 dark:bg-amber-950/40" : undefined}>{valeur}</span>
      {douteuse && <BadgeAVerifier />}
    </span>
  );
}

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-zinc-500 dark:text-zinc-400">{libelle}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{titre}</h3>
      {children}
    </section>
  );
}

export default function FicheLectureSeule({
  fiche,
  aVerifier,
  modele,
  source,
}: {
  fiche: FicheCV;
  aVerifier: string[];
  modele: string;
  source: string;
}) {
  const douteux = new Set(aVerifier);
  const v = (valeur: string | null, chemin: string) => <Valeur valeur={valeur} chemin={chemin} aVerifier={douteux} />;
  const nonTrouves = [
    ...Object.values(fiche.identite),
    ...Object.values(fiche.contact),
  ].filter((x) => x === null).length;

  return (
    <article aria-labelledby="titre-fiche" className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-2">
        <h2 id="titre-fiche" className="text-lg font-semibold">
          Fiche extraite : {source}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Lecture seule pour l&apos;instant. Vérifiez chaque champ : {aVerifier.length} valeur
          {aVerifier.length > 1 ? "s" : ""} à vérifier (absente{aVerifier.length > 1 ? "s" : ""} du texte du PDF),{" "}
          {nonTrouves} champ{nonTrouves > 1 ? "s" : ""} d&apos;identité ou de contact non trouvé{nonTrouves > 1 ? "s" : ""}.
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <BadgeAVerifier /> valeur introuvable dans le texte du PDF · <BadgeNonTrouve /> absente du CV · modèle : {modele}
        </p>
      </header>

      <Section titre="Identité">
        <dl>
          <Ligne libelle="Nom">{v(fiche.identite.nomComplet, "identite.nomComplet")}</Ligne>
          <Ligne libelle="Titre">{v(fiche.identite.titre, "identite.titre")}</Ligne>
          <Ligne libelle="Ville">{v(fiche.identite.ville, "identite.ville")}</Ligne>
          <Ligne libelle="Pays">{v(fiche.identite.pays, "identite.pays")}</Ligne>
        </dl>
      </Section>

      <Section titre="Contact">
        <dl>
          <Ligne libelle="E-mail">{v(fiche.contact.email, "contact.email")}</Ligne>
          <Ligne libelle="Téléphone">{v(fiche.contact.telephone, "contact.telephone")}</Ligne>
          <Ligne libelle="LinkedIn">{v(fiche.contact.linkedin, "contact.linkedin")}</Ligne>
          <Ligne libelle="GitHub">{v(fiche.contact.github, "contact.github")}</Ligne>
          <Ligne libelle="Site web">{v(fiche.contact.siteWeb, "contact.siteWeb")}</Ligne>
        </dl>
      </Section>

      <Section titre="Compétences">
        {fiche.competences.length === 0 ? (
          <BadgeNonTrouve />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {fiche.competences.map((c, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700">
                {v(c, `competences.${i}`)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titre="Expériences">
        {fiche.experiences.length === 0 ? (
          <BadgeNonTrouve />
        ) : (
          fiche.experiences.map((e, i) => (
            <dl key={i} className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
              <Ligne libelle="Poste">{v(e.poste, `experiences.${i}.poste`)}</Ligne>
              <Ligne libelle="Entreprise">{v(e.entreprise, `experiences.${i}.entreprise`)}</Ligne>
              <Ligne libelle="Lieu">{v(e.lieu, `experiences.${i}.lieu`)}</Ligne>
              <Ligne libelle="Début">{v(e.debut, `experiences.${i}.debut`)}</Ligne>
              <Ligne libelle="Fin">{v(e.fin, `experiences.${i}.fin`)}</Ligne>
              <Ligne libelle="Description">{e.description ?? <BadgeNonTrouve />}</Ligne>
            </dl>
          ))
        )}
      </Section>

      <Section titre="Formations">
        {fiche.formations.length === 0 ? (
          <BadgeNonTrouve />
        ) : (
          fiche.formations.map((f, i) => (
            <dl key={i} className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
              <Ligne libelle="Diplôme">{v(f.diplome, `formations.${i}.diplome`)}</Ligne>
              <Ligne libelle="Établissement">{v(f.etablissement, `formations.${i}.etablissement`)}</Ligne>
              <Ligne libelle="Début">{v(f.debut, `formations.${i}.debut`)}</Ligne>
              <Ligne libelle="Fin">{v(f.fin, `formations.${i}.fin`)}</Ligne>
            </dl>
          ))
        )}
      </Section>

      <Section titre="Langues">
        {fiche.langues.length === 0 ? (
          <BadgeNonTrouve />
        ) : (
          <dl>
            {fiche.langues.map((l, i) => (
              <Ligne key={i} libelle={l.langue}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  {aVerifier.includes(`langues.${i}.langue`) && <BadgeAVerifier />}
                  {v(l.niveau, `langues.${i}.niveau`)}
                </span>
              </Ligne>
            ))}
          </dl>
        )}
      </Section>
    </article>
  );
}
