# Muscu Hugo

Web app d’entraînement personnelle (PWA), 100 % hors ligne, installée sur l’écran d’accueil de l’iPhone.
Remplace Hevy pour un seul utilisateur. Aucun compte, aucun serveur : tout reste dans le téléphone (IndexedDB).

- Stack : Vite + React + TypeScript, Dexie (IndexedDB), vite-plugin-pwa.
- Programme de référence : `programme-seche.json` (format `hugo-training-program`, jamais modifié par l’app).
- Hébergement : GitHub Pages, déploiement automatique à chaque `git push` (workflow `.github/workflows/deploy.yml`).

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 et importer `programme-seche.json` via « Importer un programme ».

## Construire pour la production

```bash
VITE_BASE=/muscu-hugo/ npm run build
```

`VITE_BASE` est le sous-chemin de GitHub Pages (`/<nom-du-dépôt>/`). Sans cette variable, l’app est construite pour la racine `/` (Vercel, Netlify…).

## Déployer sur GitHub Pages (première fois)

1. Créer le dépôt `muscu-hugo` sur GitHub (public, pour que Pages soit gratuit) et pousser le code sur la branche `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow se lance tout seul à chaque push. L’app est ensuite disponible sur
   `https://<compte>.github.io/muscu-hugo/`.

## Installer sur l’iPhone

1. Ouvrir l’adresse ci-dessus dans **Safari** (pas Chrome).
2. Bouton **Partager** (carré avec flèche) → **Sur l’écran d’accueil** → **Ajouter**.
3. Lancer l’app depuis l’icône : elle s’ouvre en plein écran et fonctionne sans réseau.
4. Première chose à faire : **Données → Importer un programme** et choisir `programme-seche.json`
   (le fichier doit être dans l’app Fichiers de l’iPhone, iCloud Drive par exemple).

## Mettre à jour l’app

Chaque `git push` sur `main` redéploie. Sur l’iPhone, l’app se met à jour toute seule au lancement suivant
(fermer complètement l’app puis la rouvrir si l’ancienne version reste affichée).

## Données et sauvegardes

- **Données → Sauvegarder (JSON)** : programme + journal complet. À faire au moins une fois par semaine
  (rappel affiché sur l’accueil après 7 jours).
- **Données → Exporter le journal (CSV)** : une ligne par série, pour l’analyse par le coach.
- **Données → Restaurer une sauvegarde** : remplace tout par le contenu d’une sauvegarde JSON.

## Photos des exercices

Les démos (`public/exercises/<id>/0.jpg` et `1.jpg`, position de départ / finale) viennent de
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public). La correspondance
identifiant d’exercice → photos est dans `src/media.ts` ; le JSON du programme n’est pas modifié.

## Structure du code

```
src/
  types.ts        types du programme et du journal
  db.ts           base Dexie (programs, workouts, settings)
  program.ts      validation du JSON, semaine en cours, séance suivante
  workout.ts      création d'une séance, dernière performance, suggestion de progression
  export.ts       CSV, sauvegarde JSON, partage iPhone
  timer.tsx       timer de repos (basé sur l'heure de fin, survit à un rechargement)
  wakeLock.ts     écran allumé pendant la séance
  pages/          Home, Workout, Rules, Data
  components/     ExerciseCard, SetRow, RpeSheet, FinishSheet, ImportProgram
```
