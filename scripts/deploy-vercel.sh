#!/bin/sh
# Publie sur https://muscu-hugo.vercel.app/
# Le build est fait hors du dépôt git : Vercel refuse un déploiement dont l'auteur du dernier commit
# n'est pas membre du compte. Le dossier est toujours relié au projet « muscu-hugo » avant l'envoi.
set -e
OUT="${TMPDIR:-/tmp}/muscu-hugo-vercel"
npx vite build --outDir "$OUT" --emptyOutDir
cd "$OUT"
npx -y vercel@latest link --yes --project muscu-hugo
grep -q '"projectName":"muscu-hugo"' .vercel/project.json || { echo "Mauvais projet Vercel, arrêt." >&2; exit 1; }
npx -y vercel@latest deploy --prod --yes
