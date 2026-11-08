/**
 * Schéma d'exercice : uniquement si le programme fournit `imageFile`. Aucune correspondance automatique.
 * Accepte un nom de fichier (« croise-poulies.svg » → public/schemas/croise-poulies.svg),
 * un chemin relatif (« schemas/x.svg ») ou une adresse complète.
 */
export function schemaUrl(imageFile: unknown): string | null {
  if (typeof imageFile !== 'string') return null
  const raw = imageFile.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const path = raw.replace(/^\.?\//, '').replace(/^public\//, '')
  return `${import.meta.env.BASE_URL}${path.includes('/') ? path : `schemas/${path}`}`
}
