# CV Reader

CV Reader extrait les informations d'un CV en PDF (identité, compétences, expériences, formations, langues) et les fait vérifier par un humain avant tout usage. La fiche validée est ensuite comparée, critère par critère, aux exigences d'une offre, sans score ni décision automatique : la décision reste humaine.

> **Statut : en construction.** Tranches T0 (squelette) et T1 (dépôt du PDF) en place. Le PDF est contrôlé (signature, 4 Mo, 5 pages) dans le navigateur puis sur le serveur, mais l'extraction n'existe pas encore (T2).

Limite de 4 Mo, imposée par l'hébergement ; 5 Mo possibles avec un envoi direct vers un stockage, prévu en évolution.

## Pile

- Next.js (App Router), TypeScript, React
- Tailwind CSS
- Zod (validation des données)
- unpdf (lecture des PDF, sans dépendance native)
- Vitest
- Déploiement sur Vercel

## CV fictifs

Le dossier [`samples/`](samples/) contient 8 CV de personnes inventées (6 en français, 2 en anglais), chacun avec sa réponse attendue écrite à la main (`.json`), et les critères de l'offre de démonstration ([`offre.md`](samples/offre.md)). Les PDF sont produits par `npm run generer-cv` ([`scripts/generer-cv.ts`](scripts/generer-cv.ts)), qui réécrit des fichiers identiques à chaque lancement.

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

## Variables d'environnement

Les noms sont listés dans [`.env.example`](.env.example). Aucune valeur n'est versionnée : les secrets sont saisis dans les réglages du projet Vercel, côté serveur uniquement, jamais avec le préfixe `NEXT_PUBLIC_`.

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Clé de l'API Claude |
| `IP_HASH_SECRET` | Clé du HMAC des adresses IP |
| `UPSTASH_REDIS_REST_URL` | Adresse de la base Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Jeton d'accès Upstash Redis |
| `CLAUDE_MODEL` | Modèle utilisé |

## Documentation

- [Exigences produit (PRD)](docs/PRD.md)
- [Spécification technique](docs/SPEC.md)
