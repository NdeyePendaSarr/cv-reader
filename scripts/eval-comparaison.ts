/**
 * Essai réel de la comparaison (lancé à la main, jamais en CI : il consomme des crédits).
 *
 * Lancement : npm run eval-comparaison -- --modele claude-haiku-5-5 [--suffixe bis] [--ajouter "critère"]… [--cv <id>]… [--sans-offre] [--sans-rapport] [--oui]
 *
 * --ajouter (répétable) ajoute un critère à ceux de samples/offre.md pour cet essai seulement,
 * sans modifier le fichier.
 *
 * Compare les fiches de référence de trois CV fictifs (public/samples/) aux critères de
 * samples/offre.md, avec lib/compare.ts (même code qu'en production, contrôle anti-invention compris).
 * Écrit un rapport brut dans docs/eval/AAAA-MM-JJ-comparaison[-<suffixe>].md : résultat et justification par
 * critère, justifications rejetées, jetons et durée. La colonne « Avis » est à remplir par une personne.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { creerClient, ErreurExtraction } from "@/lib/claude";
import { comparer, type ResultatComparaison } from "@/lib/compare";
import { extraireCriteres } from "@/lib/offre";
import { CV_FICTIFS, FicheReferenceSchema } from "@/lib/samples";

const RACINE = join(import.meta.dirname, "..");

// Le SDK enverrait ses requêtes vers ANTHROPIC_BASE_URL si elle était définie : on vise l'API officielle.
delete process.env.ANTHROPIC_BASE_URL;

/** Les trois CV de l'essai par défaut : proche de l'offre, partiel, hors sujet (--cv pour en choisir d'autres). */
const IDS_PAR_DEFAUT = ["cv-01-lea-fictivia", "cv-03-hugo-exemplaire", "cv-05-margot-imaginaire"];

const PRIX: Record<string, { entree: number; sortie: number }> = {
  "claude-haiku-5-5": { entree: 0.1, sortie: 0.5 },
  "claude-sonnet-5-5": { entree: 2, sortie: 10 },
};

function lireArguments() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--modele");
  const modele = i >= 0 ? args[i + 1] : undefined;
  if (!modele || modele.startsWith("--")) {
    console.error("Option --modele obligatoire. Exemple : npm run eval-comparaison -- --modele claude-haiku-5-5");
    process.exit(1);
  }
  const j = args.indexOf("--suffixe");
  const suffixe = j >= 0 ? args[j + 1] : undefined;
  if (suffixe !== undefined && !/^[a-z0-9-]+$/.test(suffixe)) {
    console.error("--suffixe : lettres minuscules, chiffres et tirets seulement.");
    process.exit(1);
  }
  // --ajouter peut être répété : chaque valeur est un critère de plus, pour cet essai seulement.
  const ajouts = args.flatMap((a, k) => (a === "--ajouter" && args[k + 1] ? [args[k + 1]!.trim()] : [])).filter((c) => c !== "");
  // --cv peut être répété : fiches à comparer (par défaut, les trois CV de l'essai).
  const choisis = args.flatMap((a, k) => (a === "--cv" && args[k + 1] ? [args[k + 1]!] : []));
  const inconnus = choisis.filter((id) => !CV_FICTIFS.some((c) => c.id === id));
  if (inconnus.length > 0) {
    console.error(`--cv : identifiant inconnu (${inconnus.join(", ")}).`);
    process.exit(1);
  }
  const ids = choisis.length > 0 ? choisis : IDS_PAR_DEFAUT;
  // --sans-rapport : affiche les résultats sans écrire de fichier (vérification ponctuelle).
  // --sans-offre : n'utilise que les critères passés par --ajouter (samples/offre.md est ignoré).
  const sansOffre = args.includes("--sans-offre");
  if (sansOffre && ajouts.length === 0) {
    console.error("--sans-offre demande au moins un critère --ajouter.");
    process.exit(1);
  }
  return { modele, suffixe, ajouts, ids, sansOffre, sansRapport: args.includes("--sans-rapport"), sansQuestion: args.includes("--oui") };
}

async function principal(): Promise<void> {
  const { modele, suffixe, ajouts, ids: IDS, sansOffre, sansRapport, sansQuestion } = lireArguments();
  const criteresOffre = sansOffre ? [] : extraireCriteres(await readFile(join(RACINE, "samples", "offre.md"), "utf8"));
  const criteres = [...criteresOffre, ...ajouts];
  console.log(`Modèle : ${modele} · ${criteres.length} critères (dont ${ajouts.length} ajouté(s) pour cet essai) · ${IDS.length} fiches`);
  console.log(`Appels prévus à l'API : ${IDS.length} (jusqu'à ${2 * IDS.length} avec les nouveaux essais).`);
  if (!sansQuestion) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const reponse = (await rl.question("Lancer l'essai ? (oui/non) ")).trim().toLowerCase();
    rl.close();
    if (reponse !== "oui" && reponse !== "o") {
      console.log("Essai annulé : aucun appel effectué.");
      return;
    }
  }

  const client = creerClient();
  const lignes: string[] = [];
  const date = new Date().toISOString().slice(0, 10);
  let entree = 0;
  let sortie = 0;
  let duree = 0;
  let rejetees = 0;
  const bruts: Record<string, ResultatComparaison | string> = {};

  for (const id of IDS) {
    const cv = CV_FICTIFS.find((c) => c.id === id)!;
    const reference = FicheReferenceSchema.parse(JSON.parse(await readFile(join(RACINE, "public", "samples", `${id}.json`), "utf8")));
    process.stdout.write(`${id} … `);
    try {
      const r = await comparer(reference.fiche, criteres, modele, client);
      bruts[id] = r;
      entree += r.mesures.jetonsEntree;
      sortie += r.mesures.jetonsSortie;
      duree += r.mesures.dureeMs;
      rejetees += r.justificationsRejetees;
      console.log(`ok · ${r.justificationsRejetees} justification(s) rejetée(s) · ${(r.mesures.dureeMs / 1000).toFixed(1)} s`);
      lignes.push(`## ${cv.nom} (${cv.particularite})`, "");
      lignes.push(
        `Jetons : ${r.mesures.jetonsEntree} en entrée, ${r.mesures.jetonsSortie} en sortie · durée : ${(r.mesures.dureeMs / 1000).toFixed(1)} s · nouvel essai : ${r.mesures.nouvelEssai ? "oui" : "non"} · justifications rejetées : ${r.justificationsRejetees}`,
        "",
      );
      lignes.push("| Critère | Résultat | Justification | Avis |", "| --- | --- | --- | --- |");
      for (const res of r.resultats) {
        const statut =
          res.statut === "present"
            ? "présent"
            : res.justificationRejetee
              ? `non trouvé (justification rejetée : « ${(res.justificationRejeteeTexte ?? "").replace(/|/g, "\|")} »)`
              : "non trouvé";
        lignes.push(`| ${res.critere} | ${statut} | ${res.justification ? `« ${res.justification.replace(/\|/g, "\\|")} »` : "—"} | à compléter |`);
      }
      lignes.push("");
    } catch (erreur) {
      if (!(erreur instanceof ErreurExtraction)) throw erreur;
      bruts[id] = erreur.code;
      entree += erreur.mesures.jetonsEntree;
      sortie += erreur.mesures.jetonsSortie;
      console.log(`échec (${erreur.code})`);
      lignes.push(`## ${cv.nom}`, "", `Comparaison échouée : \`${erreur.code}\`.`, "");
    }
  }

  const p = PRIX[modele];
  const cout = p ? `${((entree * p.entree + sortie * p.sortie) / 1_000_000).toFixed(4)} $` : "prix inconnu";
  const entete = [
    `# Essai de la comparaison — ${modele} — ${date}`,
    "",
    "Produit par `scripts/eval-comparaison.ts` : fiches de référence de trois CV fictifs (`public/samples/`), comparées aux critères de `samples/offre.md` avec `lib/compare.ts`, contrôle anti-invention compris. Réglages : outil `enregistrer_comparaison` non strict, `tool_choice: auto`, réflexion et effort par défaut, ni `temperature` ni `top_p`.",
    "",
    "## Synthèse",
    "",
    "| Mesure | Valeur |",
    "| --- | --- |",
    `| Fiches comparées | ${IDS.length} × ${criteres.length} critères |`,
    ...(sansOffre
      ? ["| Critères | ceux de cet essai seulement (samples/offre.md non utilisé) |"]
      : ajouts.length > 0
        ? [`| Critères ajoutés pour cet essai seulement (hors samples/offre.md) | ${ajouts.map((c) => `« ${c} »`).join(", ")} |`]
        : []),
    `| Justifications rejetées par le contrôle anti-invention | ${rejetees} |`,
    `| Jetons (entrée / sortie, total) | ${entree} / ${sortie} |`,
    `| Durée totale | ${(duree / 1000).toFixed(1)} s |`,
    `| Coût estimé | ${cout} |`,
    "",
  ];
  if (sansRapport) {
    console.log(`Aucun rapport écrit (--sans-rapport). Jetons : ${entree} / ${sortie} · durée : ${(duree / 1000).toFixed(1)} s · coût estimé : ${cout}`);
    console.log(JSON.stringify(bruts, null, 1));
    return;
  }
  const dossier = join(RACINE, "docs", "eval");
  await mkdir(dossier, { recursive: true });
  const base = `${date}-comparaison${suffixe ? `-${suffixe}` : ""}`;
  let chemin = join(dossier, `${base}.md`);
  for (let n = 2; existsSync(chemin); n++) chemin = join(dossier, `${base}-${n}.md`);
  await writeFile(chemin, [...entete, ...lignes].join("\n") + "\n");
  console.log(`Rapport : ${chemin}`);
  console.log(`Coût estimé : ${cout}`);
  console.log("Sorties brutes :");
  console.log(JSON.stringify(bruts, null, 1));
}

principal().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : erreur);
  process.exitCode = 1;
});
