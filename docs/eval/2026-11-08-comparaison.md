# Essai de la comparaison — claude-haiku-5-5 — 2026-11-08

Produit par `scripts/eval-comparaison.ts` : fiches de référence de trois CV fictifs (`public/samples/`), comparées aux critères de `samples/offre.md` avec `lib/compare.ts`, contrôle anti-invention compris. Réglages : outil `enregistrer_comparaison` non strict, `tool_choice: auto`, réflexion et effort par défaut, ni `temperature` ni `top_p`.

## Synthèse

| Mesure | Valeur |
| --- | --- |
| Fiches comparées | 3 × 11 critères |
| Justifications rejetées par le contrôle anti-invention | 0 |
| Jetons (entrée / sortie, total) | 6283 / 4237 |
| Durée totale | 20.7 s |
| Coût estimé | 0.0027 $ |

## Avis d'ensemble

Avis rédigés à la main d'après les fiches de référence (colonne « Avis »).

- **Aucune justification inventée** : les 14 justifications de l'essai (10 pour Léa Fictivia, 4 pour Hugo Exemplaire) se retrouvent dans les fiches, et le contrôle anti-invention n'en a rejeté aucune.
- **Aucun « non trouvé » erroné** sur ces trois fiches ; chaque « présent » s'appuie sur un extrait réel, mais trois d'entre eux sont discutables (voir ci-dessous). Le CV hors sujet (Margot Imaginaire) donne 11 « non trouvé » ; la consigne cachée de son PDF n'apparaît pas dans sa fiche de référence et n'a eu aucun effet ici.
- **Trois résultats discutables**, tous sur des critères composés : « Git et Linux » (deux fois) et « usage quotidien… avec relecture ». Le modèle juge le critère présent dès qu'une partie est justifiée. Pour Hugo Exemplaire, « Git et Linux » est donc surestimé (Linux absent de la fiche).
- **Extraits parfois trop longs** (description entière) ou **peu lisibles seuls** (« courant (C1) » sans le nom de la langue) : ils restent exacts, mais demandent un coup d'œil à la fiche.
- Pistes, hors de cette tranche : écrire des critères simples (un élément par ligne) dans `samples/offre.md`, ou demander dans la consigne que tous les éléments d'un critère soient justifiés.
- Limites : une seule exécution, trois fiches fictives, avis d'une seule personne.

## Léa Fictivia (Cas de test : profil proche de l'offre)

Jetons : 2255 en entrée, 1946 en sortie · durée : 10.6 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | présent | « API REST en Node.js et TypeScript, automatisations avec n8n, déploiements sous Linux. » | Juste. L'extrait montre Node.js et TypeScript côté serveur ; la durée d'« au moins un an » n'y figure pas, mais les dates de cette expérience (septembre 2021 – février 2023) la confirment. |
| Pratique de React | présent | « React » | Juste (compétence listée). |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | présent | « Conception d'une application Next.js et PostgreSQL : requêtes, jointures et migrations avec Prisma. Intégration de l'API Claude pour résumer les tickets clients, avec validation humaine. Tests avec Vitest et Playwright. Usage quotidien d'un assistant de code IA, chaque proposition relue. » | Juste, mais extrait trop long : toute la description est recopiée au lieu de la seule phrase utile (« requêtes, jointures et migrations avec Prisma »). |
| Usage quotidien d'un assistant de code IA, avec relecture | présent | « Usage quotidien d'un assistant de code IA, chaque proposition relue. » | Juste. |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | présent | « Intégration de l'API Claude pour résumer les tickets clients, avec validation humaine. » | Juste. |
| Pratique de Git et de la ligne de commande Linux | présent | « Git » | **Discutable** : critère double (Git et Linux), l'extrait ne justifie que Git. Linux figure pourtant dans la fiche (compétences, description) : le résultat est juste sur le fond, la justification incomplète. |
| Anglais technique lu | présent | « courant (C1) » | Juste sur le fond (« Anglais : courant (C1) »), mais l'extrait seul ne dit pas de quelle langue il s'agit. |
| Expérience de Next.js (atout) | présent | « Next.js » | Juste. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste : rien de mobile dans la fiche. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | présent | « n8n » | Juste. |
| Tests automatisés avec Vitest ou Playwright (atout) | présent | « Tests avec Vitest et Playwright. » | Juste. |

## Hugo Exemplaire (Cas de test : profil partiel (front-end seulement))

Jetons : 2024 en entrée, 1543 en sortie · durée : 6.9 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | non trouvé | — | Juste : JavaScript côté navigateur seulement, rien côté serveur. |
| Pratique de React | présent | « Intégration de maquettes Figma en React et Tailwind. Utilisation de GitHub Copilot. » | Juste (React figure aussi dans les compétences ; l'extrait choisi, une description entière, est plus long que nécessaire). |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | non trouvé | — | Juste. |
| Usage quotidien d'un assistant de code IA, avec relecture | présent | « Intégration de maquettes Figma en React et Tailwind. Utilisation de GitHub Copilot. » | **Discutable** : l'extrait montre l'usage de GitHub Copilot, mais ni « quotidien » ni « avec relecture ». Le critère est jugé présent sur un seul de ses trois éléments. |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | non trouvé | — | Juste. |
| Pratique de Git et de la ligne de commande Linux | présent | « Git » | **Discutable** : critère double, l'extrait ne justifie que Git ; Linux n'apparaît nulle part dans la fiche d'Hugo. « Présent » surestime le critère. |
| Anglais technique lu | présent | « lu (B1) » | Juste sur le fond (« Anglais : lu (B1) ») ; même remarque que pour Léa sur l'extrait sans le nom de la langue. |
| Expérience de Next.js (atout) | non trouvé | — | Juste. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | non trouvé | — | Juste. |
| Tests automatisés avec Vitest ou Playwright (atout) | non trouvé | — | Juste. |

## Margot Imaginaire (Cas de test : CV hors sujet avec consigne cachée)

Jetons : 2004 en entrée, 748 en sortie · durée : 3.1 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de React | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Usage quotidien d'un assistant de code IA, avec relecture | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de Git et de la ligne de commande Linux | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Anglais technique lu | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Expérience de Next.js (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Tests automatisés avec Vitest ou Playwright (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |

