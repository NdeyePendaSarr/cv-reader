# Essai de la comparaison, concordance — claude-haiku-5-5 — 2026-11-09

Produit par `scripts/eval-comparaison.ts` : fiches de référence de trois CV fictifs (`public/samples/`), comparées aux critères de `samples/offre.md` avec `lib/compare.ts`, contrôle anti-invention compris. Réglages : outil `enregistrer_comparaison` non strict, `tool_choice: auto`, réflexion et effort par défaut, ni `temperature` ni `top_p`.

## Synthèse

| Mesure | Valeur |
| --- | --- |
| Fiches comparées | 1 × 15 critères |
| Critères | ceux de cet essai seulement (samples/offre.md non utilisé) |
| Justifications rejetées par le contrôle anti-invention | 0 |
| Jetons (entrée / sortie, total) | 2812 / 1650 |
| Durée totale | 7.3 s |
| Coût estimé | 0.0011 $ |

**Avis non relus par l'autrice.** Colonne « Avis » rédigée avec le rapport, d'après la fiche de référence de Yanis Fictif (`public/samples/cv-07-yanis-fictif.json`).

Réglages de la consigne au moment de l'essai (T4-sexies) : durées minimales, maximales et plages prouvées par les dates de début et de fin citées séparément ; aucune déduction implicite (règle 7) ; seule équivalence admise : un nom précis pour la catégorie nommée (règle 8). Quinze critères propres à cet essai, `samples/offre.md` non utilisé.

**Pas de point de comparaison « avant ».** Aucun essai de comparaison sur Yanis Fictif n'existe dans le dépôt avant celui-ci. Les extraits cités dans la demande de T4-sexies (« elementary to intermediate », une adresse de profil GitHub) ne figurent pas dans sa fiche de référence : elle donne « Anglais : technique », aucun GitHub, et un site web. Ces deux cas sont couverts par des tests simulés sur des fiches fictives dérivées de la sienne (`tests/compare.test.ts`), pas par cet essai réel.

## Avis d'ensemble

- **15 résultats jugés justes**, aucune justification rejetée, aucun nouvel essai.
- **Interfaces web et API** : les deux critères sortent « non trouvé », de façon cohérente ; la phrase « Application interne en React et Node.js » ne nomme ni l'un ni l'autre.
- **Anglais écrit** : « non trouvé » ; « Anglais : technique » est un niveau, pas une pratique de l'écrit.
- **Entre 0 et 2 ans** : « non trouvé », correct, puisque l'expérience de développement dépasse quatre ans.
- **Projet consultable** : « non trouvé », juste : un site personnel ou une adresse de profil n'est pas un projet (règle 7, confirmée par l'autrice le 09/11). Le critère était ambigu ; formulation proposée : « Lien vers un projet réalisé : dépôt, démo ou site du projet ».
- **Effet de la règle 7** : le modèle devient strict ; HTML et CSS sortent « non trouvé » faute d'être écrits, alors qu'un développeur full-stack les connaît probablement. Ce sont des « non trouvé » au sens de la fiche, pas des preuves d'absence.
- Limites : une seule exécution, une seule fiche fictive, avis non relus.

## Yanis Fictif (Cas de test : mise en page sur deux colonnes)

Jetons : 2812 en entrée, 1650 en sortie · durée : 7.3 s · nouvel essai : non · justifications rejetées : 0

| Critère | Résultat | Justification | Avis |
| --- | --- | --- | --- |
| Entre 0 et 2 ans d'expérience en développement | non trouvé | — | Juste : sa seule expérience de développement (« Développeur full-stack ») va de février 2022 à « en cours », soit plus de quatre ans au 09/11/2026 : hors de la plage. Son poste de technicien support (2019 – 2022) n'est pas du développement. |
| Connaissances en HTML | non trouvé | — | Juste au sens strict : HTML n'est écrit nulle part dans la fiche ; la « Licence professionnelle Développement web » ne le nomme pas, et la règle 7 interdit de le déduire. |
| Connaissances en CSS | non trouvé | — | Juste au sens strict, pour la même raison que HTML : CSS n'est pas écrit dans la fiche. |
| Connaissances en JavaScript | présent | « JavaScript » | Juste (compétence listée). |
| Bases de React | présent | « React » | Juste (compétence listée). |
| Bases de Node.js | présent | « Node.js » | Juste (compétence listée). |
| Développement en TypeScript ou JavaScript | présent | « TypeScript » | Juste (« ou » : un élément suffit ; TypeScript est dans les compétences). |
| Développement d'interfaces web | non trouvé | — | Juste au sens strict : « Application interne en React et Node.js » ne nomme pas le développement d'interfaces. Le résultat est maintenant cohérent avec celui du critère API. |
| Développement d'API | non trouvé | — | Juste au sens strict, et cohérent avec le critère précédent : aucune API n'est écrite dans la fiche. |
| Rédaction de documentation technique | non trouvé | — | Juste : aucune documentation mentionnée. |
| Communication écrite en anglais | non trouvé | — | Juste : la fiche donne seulement « Anglais : technique », un niveau, pas une pratique de l'écrit. |
| Un projet réalisé consultable : GitHub, site web ou démo | non trouvé | — | Juste : un site personnel n'est pas un projet ; critère mal formulé, à réécrire en « Lien vers un projet réalisé : dépôt, démo ou site du projet ». |
| Expérience de travail à distance | non trouvé | — | Juste : aucune mention de travail à distance. |
| Contribution à un projet open source | non trouvé | — | Juste : aucune contribution open source mentionnée. |
| SQL, PostgreSQL ou GitHub (atout) | présent | « PostgreSQL » | Juste (« ou » : PostgreSQL est dans les compétences). |

