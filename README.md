# Muscu Hugo

Web app d’entraînement personnelle (PWA), 100 % hors ligne, installée sur l’écran d’accueil de l’iPhone.
Remplace Hevy pour un seul utilisateur. Aucun compte, aucun serveur : tout reste dans le téléphone (IndexedDB).

- Stack : Vite + React + TypeScript, Dexie (IndexedDB), vite-plugin-pwa.
- Programme de référence : `programme-seche.json` (format `hugo-training-program`, jamais modifié par l’app).
- Hébergement : GitHub Pages (branche `gh-pages`), publié par `npm run deploy`.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 : le programme se charge tout seul au premier lancement.

## Construire pour la production

```bash
VITE_BASE=/muscu-hugo/ npm run build
```

`VITE_BASE` est le sous-chemin de GitHub Pages (`/<nom-du-dépôt>/`). Sans cette variable, l’app est construite pour la racine `/` (Vercel, Netlify…).

## Déployer sur Vercel (adresse utilisée : https://muscu-hugo.vercel.app/)

```bash
npx vite build --outDir /tmp/muscu-vercel --emptyOutDir
cd /tmp/muscu-vercel && npx vercel@latest deploy --prod --yes --name muscu-hugo
```

## Déployer sur GitHub Pages

```bash
npm run deploy
```

Construit l’app avec `VITE_BASE=/muscu-hugo/` et pousse le dossier `dist` sur la branche `gh-pages`
du dépôt `hugoherbin-lab/muscu-hugo`. GitHub Pages est configuré pour servir cette branche :
l’app est en ligne 1 à 2 minutes plus tard sur https://hugoherbin-lab.github.io/muscu-hugo/.

Première fois (déjà fait) : dépôt créé avec `gh repo create`, puis Pages → Source : branche `gh-pages`.

## Installer sur l’iPhone

1. Ouvrir l’adresse ci-dessus dans **Safari** (pas Chrome).
2. Bouton **Partager** (carré avec flèche) → **Sur l’écran d’accueil** → **Ajouter**.
3. Lancer l’app depuis l’icône : elle s’ouvre en plein écran et fonctionne sans réseau.
4. Le programme `programme-seche.json` est livré avec l’app et se charge tout seul. Quand ce fichier change
   dans le dépôt, l’app le remplace une seule fois au lancement suivant, sans toucher au journal.
   Pour charger un autre programme : **Données → Importer un programme**.

## Mettre à jour l’app

Après chaque modification : `git push` (sauvegarde du code) puis `npm run deploy` (mise en ligne). Sur l’iPhone, l’app se met à jour toute seule au lancement suivant
(fermer complètement l’app puis la rouvrir si l’ancienne version reste affichée).

## Données et sauvegardes

- **Données → Sauvegarder (JSON)** : programme + journal complet. À faire au moins une fois par semaine
  (rappel affiché sur l’accueil après 7 jours).
- **Données → Exporter le journal (CSV)** : une ligne par série, pour l’analyse par le coach.
- **Données → Restaurer une sauvegarde** : remplace tout par le contenu d’une sauvegarde JSON.

## Schémas des exercices

Un exercice affiche un schéma seulement si le programme contient `imageFile` (ex. `"imageFile": "croise-poulies.svg"`).
Les fichiers sont dans `public/schemas/` et sont mis en cache pour le hors-ligne. Aucune image n'est associée
automatiquement : sans `imageFile`, pas d'image.

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
