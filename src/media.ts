/**
 * Démos visuelles des exercices : deux photos (position de départ / position finale)
 * affichées en alternance, comme un GIF. Fichiers dans public/exercises/<id>/0.jpg et 1.jpg.
 * Source : free-exercise-db (domaine public, https://github.com/yuhonas/free-exercise-db).
 * La correspondance se fait sur l'identifiant d'exercice du programme ; le JSON n'est pas modifié.
 */
const WITH_MEDIA = new Set([
  'incline-db', 'hs-chest', 'decline', 'cable-fly-high', 'cable-lat', 'rope-pushdown',
  'lat-wide', 'hs-row', 'machine-row', 'lat-neutral', 'db-shrug', 'rear-cable', 'preacher-machine',
  'hack', 'rdl', 'leg-press', 'leg-ext', 'seated-curl', 'crunch-machine',
  'shoulder-machine', 'hs-incline', 'db-lat', 'cable-lat-2', 'smith-shrug', 'db-rear',
  'ez-curl', 'overhead-rope', 'hammer', 'bar-pushdown', 'cable-fly-high-2', 'cable-lat-3', 'leg-raise',
])

export function exerciseFrames(exerciseId: string): string[] | null {
  if (!WITH_MEDIA.has(exerciseId)) return null
  const base = import.meta.env.BASE_URL
  return [`${base}exercises/${exerciseId}/0.jpg`, `${base}exercises/${exerciseId}/1.jpg`]
}
