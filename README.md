# CV Reader

CV Reader extrait les informations d'un CV en PDF (identité, compétences, expériences, formations, langues) et les fait vérifier par un humain avant tout usage. La fiche validée est ensuite comparée, critère par critère, aux exigences d'une offre, sans score ni décision automatique : la décision reste humaine.

> **Statut : en construction.** Seul le squelette (tranche T0) est en place : page d'accueil, tests et intégration continue.

## Pile

- Next.js (App Router), TypeScript, React
- Tailwind CSS
- Vitest
- Déploiement sur Vercel

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
