# CV Reader

CV Reader extrait les informations d'un CV en PDF (identité, compétences, expériences, formations, langues) et les fait vérifier par un humain avant tout usage. La fiche validée est ensuite comparée, critère par critère, aux exigences d'une offre, sans score ni décision automatique : la décision reste humaine.

> **Statut : en construction.** Tranches T0 (squelette), T1 (dépôt du PDF) et T2 (extraction structurée) en place : le PDF est contrôlé (signature, 4 Mo, 5 pages), la fiche est extraite par l'API Claude, validée par Zod, puis chaque valeur est cherchée dans le texte du PDF. T3 (validation humaine) aussi : chaque champ se corrige, les valeurs « à vérifier » se confirment, et la fiche n'est téléchargeable en JSON (avec le nombre de champs corrigés) qu'après un clic sur « Valider ». Le fichier est créé dans le navigateur, rien n'est conservé. La comparaison avec une offre (T4) reste à faire.

Limite de 4 Mo, imposée par l'hébergement ; 5 Mo possibles avec un envoi direct vers un stockage, prévu en évolution.

## Pile

- Next.js (App Router), TypeScript, React
- Tailwind CSS
- API Claude (SDK officiel `@anthropic-ai/sdk`), modèle Claude Haiku 5.5
- Zod (validation des données)
- unpdf (lecture des PDF, sans dépendance native)
- Upstash Redis et `@upstash/ratelimit` (quotas, adresses IP gardées en empreinte HMAC)
- Vitest, Testing Library et jsdom (tests de l'interface)
- Déploiement sur Vercel

## CV fictifs

Le dossier [`samples/`](samples/) contient 8 CV de personnes inventées (6 en français, 2 en anglais), chacun avec sa réponse attendue écrite à la main (`.json`), et les critères de l'offre de démonstration ([`offre.md`](samples/offre.md)). Les PDF sont produits par `npm run generer-cv` ([`scripts/generer-cv.ts`](scripts/generer-cv.ts)), qui réécrit des fichiers identiques à chaque lancement.

Dans la démo, un clic sur un CV fictif affiche sa fiche de référence (`public/samples/`), sans appel au modèle : c'est gratuit, instantané, et cela marche même quand le quota est atteint. Ces fiches sont la sortie réelle de Claude Haiku 5.5 lors de l'évaluation, jamais retouchée ; elles gardent leurs valeurs « à vérifier » (les 24 du CV scanné, qui n'a pas de texte).

## Fiabilité mesurée

Mesure du 08/11/2026 par [`scripts/eval.ts`](scripts/eval.ts) sur les 8 CV fictifs, comparés champ par champ à leur réponse attendue. Mêmes réglages pour les deux modèles : même code, outil non strict avec le schéma Zod complet, réflexion et effort par défaut. Rapports complets : [Haiku 5.5](docs/eval/2026-11-08-claude-haiku-5-5.md), [Sonnet 5.5](docs/eval/2026-11-08-claude-sonnet-5-5.md).

| Mesure | Claude Haiku 5.5 | Claude Sonnet 5.5 |
| --- | --- | --- |
| Extractions réussies | 8 / 8 | 8 / 8 |
| Champs courts justes (identité, contact, compétences, parcours, langues) | 291 / 291 | 290 / 291 |
| Valeurs retrouvées dans le texte du PDF (7 CV avec texte) | 229 / 229 | 228 / 228 |
| Sorties refusées par Zod / réponses sans appel de l'outil / nouveaux essais | 0 / 0 / 0 | 0 / 0 / 0 |
| Jetons par CV, en moyenne (entrée / sortie) | 3 914 / 964 | 3 914 / 622 |
| Durée moyenne par CV | 3,8 s | 4,1 s |
| Coût estimé par CV | 0,0009 $ | 0,0140 $ |
| Consigne cachée dans un CV (« Ignore tes consignes… ») | aucun effet | aucun effet |

La seule différence : pour le CV incomplet, Sonnet a laissé vide une date de début (« 2023 », seule sur sa ligne) que la réponse attendue retient. Le CV scanné (une image, sans texte) a été lu correctement par les deux modèles ; toutes ses valeurs restent signalées « à vérifier », puisqu'aucune ne peut être retrouvée dans un texte.

**Modèle retenu : Claude Haiku 5.5.** Sur ce jeu, il est aussi fiable que Sonnet 5.5, aussi rapide, et environ 16 fois moins cher par CV ; avec le plafond de 100 appels par jour, la démo coûte moins de 0,10 $ par jour. Un second passage de Haiku, celui qui a produit les fiches de référence, a donné les mêmes scores (291 / 291 champs justes, aucune injection suivie), avec des jetons et une durée légèrement différents : 1 020 jetons de sortie et 4,0 s par CV en moyenne ([rapport](docs/eval/2026-11-08-claude-haiku-5-5-2.md)).

**Limites de cette mesure, à lire avec les chiffres ci-dessus :**

- Seulement 8 CV, tous fictifs et mis en page proprement (une ou deux colonnes, polices standard) : un vrai CV est souvent plus désordonné.
- Les CV et leurs réponses attendues ont été écrits par le même outil, dans la même session : les réponses attendues reflètent la lecture de cet outil, pas celle d'un relecteur indépendant.
- Une seule exécution par modèle pour la comparaison (deux pour Haiku) ; les sorties d'un modèle varient d'un passage à l'autre, donc les écarts d'un champ ne sont pas significatifs.
- Pas encore testé sur de vrais CV. La démo demande d'ailleurs de ne pas en déposer.
- Les chiffres disent que l'extraction recopie bien ces CV ; ils ne dispensent pas de la vérification humaine, qui reste le principe de l'outil.

## Lancement local

Prérequis : Node.js 24 (24.x).

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres commandes :

```bash
npm run lint       # ESLint
npm run typecheck  # vérification des types (tsc --noEmit)
npm test           # tests Vitest
npm run build      # compilation de production
npm run generer-cv # régénère les PDF de samples/
```

## Lancer l'évaluation

`scripts/eval.ts` extrait les 8 CV fictifs avec l'API Claude et compare chaque fiche à sa réponse attendue. Il consomme des crédits : il se lance à la main, jamais en CI, et demande une confirmation avant le premier appel. Il lit `.env.local` (au moins `ANTHROPIC_API_KEY`).

```bash
npm run eval -- --modele claude-haiku-5-5
```

Le rapport est écrit dans `docs/eval/AAAA-MM-JJ-<modele>.md`. L'option `--ecrire-references` écrit en plus les fiches de référence dans `public/samples/`, telles que le modèle les a produites.

Le script retire `ANTHROPIC_BASE_URL` de son environnement avant tout appel, pour viser toujours l'API officielle, même si un outil de développement a défini cette variable.

## Variables d'environnement

Les noms sont listés dans [`.env.example`](.env.example). Aucune valeur n'est versionnée : les secrets sont saisis dans les réglages du projet Vercel, côté serveur uniquement, jamais avec le préfixe `NEXT_PUBLIC_`.

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Clé de l'API Claude |
| `IP_HASH_SECRET` | Clé du HMAC des adresses IP |
| `KV_REST_API_URL` | Adresse REST de la base Upstash Redis (créée par l'intégration Vercel) |
| `KV_REST_API_TOKEN` | Jeton d'accès Upstash Redis (créé par l'intégration Vercel) |
| `CLAUDE_MODEL` | Modèle utilisé |

## Documentation

- [Exigences produit (PRD)](docs/PRD.md)
- [Spécification technique](docs/SPEC.md)
