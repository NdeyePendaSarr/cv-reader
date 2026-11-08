# PRD — Lecteur de CV

Nov 8, 2026 · @Ndeye Penda SARR

## Contexte et problème

Le lecteur de CV prouve, sur un cas concret, ce que demande le poste Atypix : intégrer un modèle de langage dans un produit, avec des garde-fous et une validation humaine.

- L'offre cite « lecture de CV » parmi les intégrations de modèles de langage attendues.
- Le recrutement d'Atypix suit le même principe : « Votre CV est comparé aux critères de l'offre ; un recruteur vérifie chaque résultat ».
- Hypothèse à vérifier par la mesure : saisir un CV à la main et le comparer à une offre prend du temps et laisse passer des oublis.
- Livrables pour la candidature : une démo en ligne, un dépôt GitHub public et quelques lignes pour le champ « agent ou automatisation » du formulaire.

## Utilisateurs et parcours

L'utilisatrice cible est une personne qui recrute : elle trie des CV pour une offre et garde la décision. Le visiteur de la démo (le recruteur d'Atypix) joue ce rôle avec des CV fictifs.

1. Elle dépose un CV en PDF ou choisit un CV fictif fourni.
2. L'application extrait les informations : identité, compétences, expériences, formations, langues.
3. Elle vérifie chaque champ, corrige si besoin, puis valide. Les champs non trouvés et les valeurs « à vérifier » sont signalés, jamais remplis par le modèle.
4. Elle colle les critères d'une offre.
5. L'application compare la fiche validée à l'offre : chaque critère est présent (avec l'élément qui le justifie) ou non trouvé.
6. Elle télécharge la fiche validée en JSON. Rien n'est conservé : ni le PDF, ni la fiche.

## Objectifs et mesures de réussite

Chaque chiffre du README viendra d'une mesure réelle sur le jeu de CV fictifs, jamais d'une estimation. Les cibles restent vides jusqu'au premier essai.

| Objectif | Comment on le mesure | Cible |
| --- | --- | --- |
| Démo en ligne et fonctionnelle | Lien Vercel testé depuis un autre appareil | Avant le 21/11 |
| Temps gagné (critère Atypix : heures de travail manuel supprimées) | Chrono : saisie à la main contre saisie avec l'outil, sur les mêmes CV fictifs | À fixer après le 1er essai |
| Fiabilité de l'extraction | Part des champs justes, comparés à la réponse attendue de chaque CV fictif ; nombre de champs corrigés par l'humain | À fixer après le 1er essai |
| Aucune donnée inventée | Tests : un CV sans e-mail donne un e-mail vide et signalé | 100 % des tests passent |
| Coût maîtrisé | Jetons et durée journalisés par extraction, coût moyen par CV | À fixer après le 1er essai |

## Périmètre

La V1 couvre un seul parcours, de bout en bout : un CV, une offre, une fiche validée.

**Dans la V1**

- Dépôt d'un PDF de 4 Mo au plus (limite imposée par l'hébergement Vercel ; 5 Mo possibles plus tard avec un envoi direct vers un stockage), ou choix d'un CV fictif
- Extraction structurée, validée par un schéma
- Écran de validation et de correction humaine
- Comparaison critère par critère : présent ou non trouvé
- Téléchargement de la fiche validée en JSON, sans base de données
- Garde-fous : taille, débit, coût, journaux

**Hors V1**

- Fichiers Word (évolution prévue)
- Base de données pour les fiches validées (Neon, évolution après le 18/11 si le temps le permet)
- Score, classement ou décision automatique (exclus volontairement, pas reportés)
- Stockage des PDF
- Comptes utilisateurs et rôles
- Traitement par lots de plusieurs CV
- Envoi de messages aux candidats

## Exigences par tranche

Chaque tranche est livrée déployée et testée avant de passer à la suivante. Les cases sont les critères d'acceptation.

**T0 — Squelette déployé**

- [ ] Projet Next.js + TypeScript + Tailwind en ligne sur Vercel
- [ ] Clé API présente uniquement comme variable d'environnement côté serveur
- [ ] Vitest lancé en CI sur chaque push

**T1 — Dépôt du PDF**

- [ ] Seul un PDF est accepté : type vérifié côté client et côté serveur (signature `%PDF`)
- [ ] Un fichier de plus de 4 Mo est refusé deux fois : dans le navigateur avant l'envoi (message clair), puis sur le serveur ; un PDF de plus de 5 pages est refusé (400)
- [ ] Les 8 CV fictifs se choisissent sans appel au modèle : leur fiche de référence, vraie sortie du modèle jamais retouchée, est pré-calculée

**T2 — Extraction structurée**

- [ ] Une route serveur envoie le PDF à l'API Claude et reçoit un JSON
- [ ] Le JSON est validé par un schéma Zod avant tout affichage, puis chaque valeur est cherchée dans le texte du PDF : introuvable, elle est marquée « à vérifier »
- [ ] Une information absente du CV donne `null`, affiché « non trouvé »
- [ ] Si la validation échoue : un seul nouvel essai, puis un message d'erreur lisible
- [ ] Le PDF est traité en mémoire et n'est écrit nulle part

**T3 — Validation humaine**

- [ ] Formulaire pré-rempli, chaque champ modifiable
- [ ] Champs non trouvés mis en évidence
- [ ] La fiche n'est téléchargeable qu'après un clic sur « Valider »
- [ ] La fiche validée est téléchargée en JSON, avec le nombre de champs corrigés

**T4 — Comparaison avec l'offre**

- [ ] L'utilisatrice colle les critères d'une offre
- [ ] Pour chaque critère : « présent » avec l'élément du CV qui le justifie, ou « non trouvé »
- [ ] Aucun score, aucun classement, aucun verdict
- [ ] Mention visible : la décision reste humaine

## Garde-fous, sécurité et données personnelles

Chaque garde-fou a un test qui le prouve : c'est ce qui répond à « protection des données personnelles, y compris quand elles passent par une IA ».

| Risque | Garde-fou | Preuve (test ou vérification) |
| --- | --- | --- |
| Données personnelles exposées | Démo avec CV fictifs, avertissement « ne déposez pas de vrai CV », ni PDF ni fiche stockés | Test : aucune écriture de fichier ; aucun bucket de stockage créé |
| Modèle qui invente | Schéma Zod, consigne « null si absent », valeurs cherchées dans le texte du PDF, validation humaine | Test : CV fictif sans e-mail → e-mail `null` |
| Instructions cachées dans un CV | Le texte du CV est traité comme des données ; la sortie est limitée au schéma | Test : CV fictif contenant « ignore tes consignes » → sortie toujours conforme |
| Crédits API épuisés | Quota par IP et par route (5 par heure, 15 par jour), plafond commun de 100 appels au modèle par jour puis résultats d'exemple ; compteurs dans Upstash Redis, IP gardées en empreinte HMAC ; aucun moyen de paiement sur le compte | Test : requête au-delà du quota → réponse 429 |
| Fichier trop lourd | 4 Mo au plus, vérifié dans le navigateur puis côté serveur (Vercel refuse tout corps de requête au-delà de 4,5 Mo) | Test : PDF de 4,2 Mo refusé par le serveur, même si le navigateur est contourné |
| Clé API ou secret HMAC divulgué | Clé API et secret HMAC créés et saisis par Penda dans Vercel, côté serveur seulement, jamais dans le dépôt, jamais en `NEXT_PUBLIC_` | Vérification en CI : aucune clé dans le code ni dans le bundle client |
| Diagnostic impossible | Une ligne de journal par extraction : durée, jetons, statut, sans contenu du CV | Test : la ligne de journal ne contient aucun champ du CV |

## Pile technique et contraintes

La pile reprend celle d'Atypix, sauf Supabase : son offre gratuite est déjà utilisée par Cotiz et FocusDay, qui le démontrent déjà.

| Couche | Choix |
| --- | --- |
| Application | Next.js (App Router), TypeScript, React |
| Interface | Tailwind |
| Modèle | API Claude via le SDK officiel ; modèle à choisir après essai sur les CV fictifs (précision contre coût) |
| Validation | Zod |
| Base de données | Aucune en V1 (fiche téléchargée en JSON) ; Neon en évolution possible |
| Limitation de débit | Upstash Redis (Marketplace Vercel) et `@upstash/ratelimit` : compteurs seulement, aucune donnée de CV |
| Tests | Vitest |
| Déploiement | Vercel |

Contraintes : 100 $ de crédits API promotionnels, valables jusqu'au 05/05/2027 ; uniquement des offres d'hébergement gratuites.

## Calendrier

&#91;embedded content: calendrier · du 9 au 30 nov. 2026\]

Les tranches s'enchaînent sans se chevaucher ; PharmaNPS doit être réglé avant le début de T4, le 16/11.

## Risques et questions ouvertes

**Risques**

| Risque | Parade |
| --- | --- |
| Semaine du 11 au 15/11 trop chargée (M2 + ODC) | T0 en ligne dès le 10/11 ; T4 réduite si besoin, jamais les garde-fous |
| Base Render de PharmaNPS expirée vers le 19/11, lien mort sur le CV | Régler avant le 16/11 |
| Démo vidée de ses crédits par un visiteur | Quota par IP et plafond global (T2) |
| Extraction peu fiable sur certains CV | Mesurer sur le jeu fictif, documenter les limites dans le README |

**Décisions du 08/11**

| Sujet | Décision |
| --- | --- |
| Nom | Dépôt `cv-reader`, nom affiché « CV Reader » (« Lecteur de CV » en français) |
| CV fictifs | 8 : 6 en français, 2 en anglais. 2 bons profils pour l'offre, 2 moyens, 1 hors sujet, 1 incomplet (sans téléphone, dates manquantes), 1 sur deux colonnes, 1 PDF scanné |
| Quota | Par IP et par route (extraction, comparaison) : 5 appels par heure et 15 par jour ; 100 appels au modèle par jour au total, puis CV fictifs seulement (gratuits). Ajusté après mesure du coût réel sur 10 essais dans la Console |
| Stockage du quota | Upstash Redis : compteurs qui expirent seuls (1 h et 24 h), donc aucune empreinte gardée plus longtemps que nécessaire, à écrire dans le README ; IP jamais en clair, gardées en empreinte HMAC avec une clé secrète côté serveur |
| Sécurité financière | Les 100 $ de crédits prépayés, sans carte, sont le vrai plafond ; le plafond quotidien évite seulement de tout consommer en un jour |
| Hébergement | Offres gratuites uniquement |
| Base de données | Aucune en V1 ; Neon en évolution après le 18/11 |

**Questions encore ouvertes**

- [ ] Limites de l'offre gratuite d'Upstash Redis, à vérifier sur le compte avant T2.
- [ ] PDF scanné : l'API Claude lit aussi les pages d'un PDF comme des images, donc il sera peut-être extrait au lieu d'être refusé. Tester d'abord, puis choisir : extraire avec un avertissement, ou refuser proprement.
- [ ] Durée d'une fonction : 300 s au maximum sur l'offre gratuite de Vercel (réglé le 08/11 d'après la documentation) ; reste à mesurer le temps réel d'une extraction.
