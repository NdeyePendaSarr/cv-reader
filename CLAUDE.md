# Règles permanentes du dépôt cv-reader

- Messages de commit en français, sans ligne « Co-Authored-By », sans mention de Claude ni d'un assistant, nulle part dans le dépôt.
- Ne jamais lire, afficher ni créer de fichier .env contenant des valeurs. Les secrets sont saisis par Penda dans Vercel. Le dépôt ne contient qu'un `.env.example` avec les noms.
- Pas de push forcé. Peu de commits, chacun cohérent (pas de rafale).
- Code TypeScript strict, commenté en français, testé avec Vitest.
- Ne jamais affirmer qu'une chose marche sans l'avoir exécutée : coller la sortie réelle des commandes.
- La spec (`docs/SPEC.md`) fait foi. S'il faut s'en écarter, s'arrêter et expliquer pourquoi avant de coder.

Documents de référence : `docs/PRD.md` et `docs/SPEC.md`. Notes propres à Next.js : `AGENTS.md`.
