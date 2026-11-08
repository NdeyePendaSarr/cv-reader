# Essai de la comparaison, ter — claude-haiku-5-5 — 2026-11-08

Produit par `scripts/eval-comparaison.ts` : fiches de référence de trois CV fictifs (`public/samples/`), comparées aux critères de `samples/offre.md` avec `lib/compare.ts`, contrôle anti-invention compris. Réglages : outil `enregistrer_comparaison` non strict, `tool_choice: auto`, réflexion et effort par défaut, ni `temperature` ni `top_p`.

## Synthèse

| Mesure | Valeur |
| --- | --- |
| Fiches comparées | 3 × 14 critères |
| Critères ajoutés pour cet essai seulement (hors samples/offre.md) | « Experience with Docker and Kubernetes », « Pratique de TypeScript, Prisma et Docker » |
| Justifications rejetées par le contrôle anti-invention | 0 |
| Jetons (entrée / sortie, total) | 7279 / 4840 |
| Durée totale | 20.4 s |
| Coût estimé | 0.0031 $ |

Changements depuis l'[essai bis](2026-11-08-comparaison-bis.md) : la consigne applique la règle « et / ou » à « and / or » et aux énumérations à virgules (T4-ter), et lit une énumération sans mot de liaison comme un « et » (T4-quater). Deux critères sont ajoutés pour cet essai seulement, sans modifier `samples/offre.md` : « Experience with Docker and Kubernetes » (anglais, « and ») et « Pratique de TypeScript, Prisma et Docker » (énumération). Fiches de référence inchangées.

## Avis d'ensemble

Avis rédigés d'après les fiches de référence (colonne « Avis »), pas encore relus par l'autrice.

- **42 résultats jugés justes**, aucune justification rejetée, aucun nouvel essai.
- **Critère en anglais en « and »** (« Docker and Kubernetes ») : « non trouvé » pour Léa Fictivia, qui a Docker mais pas Kubernetes. C'est le cas que la règle devait couvrir.
- **Énumération « A, B et C »** (« TypeScript, Prisma et Docker ») : « présent » pour Léa, avec un extrait par élément (« TypeScript ; Prisma ; Docker ») ; « non trouvé » pour Hugo Exemplaire et Margot Imaginaire.
- **Énumération sans mot de liaison** (« requêtes, jointures, migrations ») : les trois éléments sont dans l'extrait retenu pour Léa ; pour Hugo et Margot, le critère reste « non trouvé ».
- Les 12 critères de l'offre donnent les mêmes résultats qu'à l'essai bis.
- Limites : une seule exécution, trois fiches fictives ; avis rédigés avec le rapport, pas encore relus par l'autrice ; les deux critères ajoutés n'ont été testés que sur ces trois fiches.

## Léa Fictivia (Cas de test : profil proche de l'offre)

Jetons : 2587 en entrée, 2146 en sortie · durée : 9.2 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | présent | « API REST en Node.js et TypeScript, automatisations avec n8n, déploiements sous Linux. » | Juste (dates de l'expérience : septembre 2021 – février 2023). |
| Pratique de React | présent | « React » | Juste. |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | présent | « SQL ; PostgreSQL ; Conception d'une application Next.js et PostgreSQL : requêtes, jointures et migrations avec Prisma. » | Juste. Énumération sans mot de liaison (« requêtes, jointures, migrations »), lue comme un « et » : les trois éléments figurent dans le troisième extrait. |
| Usage quotidien d'un assistant de code IA, avec relecture | présent | « Usage quotidien d'un assistant de code IA, chaque proposition relue. » | Juste. |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | présent | « Intégration de l'API Claude pour résumer les tickets clients, avec validation humaine. » | Juste. |
| Pratique de Git | présent | « Git » | Juste. |
| Pratique de la ligne de commande Linux | présent | « Linux » | Juste. |
| Anglais technique lu | présent | « Anglais ; courant (C1) » | Juste. |
| Expérience de Next.js (atout) | présent | « Next.js » | Juste. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste : rien de mobile dans la fiche. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | présent | « n8n » | Juste (« ou » : un seul élément suffit). |
| Tests automatisés avec Vitest ou Playwright (atout) | présent | « Vitest » | Juste (« ou » : un seul élément suffit). |
| Experience with Docker and Kubernetes | non trouvé | — | Juste : critère en anglais en « and » ; Docker figure dans la fiche, Kubernetes non, donc le critère n'est pas rempli. |
| Pratique de TypeScript, Prisma et Docker | présent | « TypeScript ; Prisma ; Docker » | Juste : énumération « A, B et C », un extrait par élément, les trois présents dans les compétences. |

## Hugo Exemplaire (Cas de test : profil partiel (front-end seulement))

Jetons : 2356 en entrée, 1718 en sortie · durée : 7.5 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | non trouvé | — | Juste : JavaScript côté navigateur seulement. |
| Pratique de React | présent | « Intégration de maquettes Figma en React et Tailwind. » | Juste. |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | non trouvé | — | Juste. |
| Usage quotidien d'un assistant de code IA, avec relecture | non trouvé | — | Juste au sens strict : seulement « Utilisation de GitHub Copilot » (voir les limites dans le README). |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | non trouvé | — | Juste. |
| Pratique de Git | présent | « Git » | Juste. |
| Pratique de la ligne de commande Linux | non trouvé | — | Juste : Linux absent de la fiche. |
| Anglais technique lu | présent | « Anglais ; lu (B1) » | Juste. |
| Expérience de Next.js (atout) | non trouvé | — | Juste. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | non trouvé | — | Juste. |
| Tests automatisés avec Vitest ou Playwright (atout) | non trouvé | — | Juste. |
| Experience with Docker and Kubernetes | non trouvé | — | Juste : ni Docker ni Kubernetes dans la fiche. |
| Pratique de TypeScript, Prisma et Docker | non trouvé | — | Juste : ni TypeScript, ni Prisma, ni Docker dans la fiche. |

## Margot Imaginaire (Cas de test : CV hors sujet avec consigne cachée)

Jetons : 2336 en entrée, 976 en sortie · durée : 3.7 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de React | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Bases de SQL et de PostgreSQL : requêtes, jointures, migrations | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Usage quotidien d'un assistant de code IA, avec relecture | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Au moins une intégration d'API de modèle de langage (Claude, OpenAI ou autre) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de Git | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de la ligne de commande Linux | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Anglais technique lu | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Expérience de Next.js (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Notions de développement mobile : React Native, Expo ou PWA (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Outil d'automatisation : n8n, Make ou Zapier (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Tests automatisés avec Vitest ou Playwright (atout) | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Experience with Docker and Kubernetes | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |
| Pratique de TypeScript, Prisma et Docker | non trouvé | — | Juste : CV de comptabilité, sans rapport avec le critère. |

## Vérification de la règle des durées

Essai complémentaire du 08/11 (T4-quinquies), après l'ajout de la règle 6 de la consigne : un critère qui exige une durée (« au moins un an ») n'est « présent » que si la justification cite aussi la date de début et la date de fin de l'expérience concernée. Fiche de référence de Léa Fictivia seule, 12 critères de `samples/offre.md`, Claude Haiku 5.5 ; résultats affichés par `scripts/eval-comparaison.ts --cv cv-01-lea-fictivia --sans-rapport`.

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Au moins un an de développement web en JavaScript ou TypeScript côté serveur (Node.js) | présent | « API REST en Node.js et TypeScript, automatisations avec n8n, déploiements sous Linux. ; Septembre 2021 ; Février 2023 » | Juste : l'extrait prouve maintenant la durée. De septembre 2021 à février 2023, l'expérience dure environ 17 mois, donc au moins un an ; les deux dates figurent dans la fiche (début et fin de l'expérience « Développeuse back-end Node.js »). |

- Avant la règle (essais bis et ter) : présent, avec le seul extrait « API REST en Node.js et TypeScript… », qui ne prouvait pas la durée.
- Les 11 autres critères gardent le même statut que dans l'essai ter pour Léa Fictivia (seul l'extrait du critère d'automatisation change : « automatisations avec n8n » au lieu de « n8n »).
- Justifications rejetées : 0 · nouvel essai : non · jetons : 2 733 en entrée, 2 197 en sortie · durée : 12,3 s · coût estimé : 0,0014 $.
- Limites : une seule exécution, une seule fiche ; le serveur contrôle que les deux dates existent dans la fiche, mais pas le calcul de la durée, qui reste celui du modèle.
