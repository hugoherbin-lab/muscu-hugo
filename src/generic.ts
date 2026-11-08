/**
 * Affichage générique du programme : tout champ texte ou liste de textes ajouté plus tard
 * dans rules, dans une séance ou dans un exercice s'affiche sans modifier le code.
 */

export interface TextSection {
  key: string
  label: string
  lines: string[]
}

// Titres soignés pour les champs connus. Un champ absent de cette liste reçoit un titre déduit de son nom.
const LABELS: Record<string, string> = {
  progression: 'Progression',
  tempo: 'Tempo',
  shoulderPain: 'Douleur épaule droite (0 à 10)',
  findLoad: 'Trouver sa charge',
  rir: 'RIR et RPE',
  validRep: 'Rep valide',
  autoregulation: 'Autorégulation',
  notes: 'Notes',
}

// Champs déjà affichés ailleurs par l'écran séance, ou purement techniques.
const SESSION_HANDLED = new Set(['id', 'name', 'order', 'defaultDay', 'exercises', 'notes'])
const EXERCISE_HANDLED = new Set([
  'id', 'name', 'muscle', 'sets', 'repMin', 'repMax', 'restSec', 'warmup', 'startWeightKg', 'startNote',
  'incrementKg', 'perSide', 'reference', 'supersetGroup', 'substitute', 'tips', 'mediaUrl', 'imageFile',
])

export function labelFor(key: string): string {
  if (LABELS[key]) return LABELS[key]
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Transforme n'importe quelle valeur JSON en lignes de texte lisibles. */
export function toLines(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(toLines)
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>)
    const simple = values.every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    if (simple) {
      const joined = values.flatMap(toLines).join(' : ')
      return joined ? [joined] : []
    }
    return values.flatMap(toLines)
  }
  return []
}

function sectionsOf(obj: unknown, skip: Set<string>, textOnly: boolean): TextSection[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  const out: TextSection[] = []
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (skip.has(key)) continue
    if (textOnly && (typeof value === 'number' || typeof value === 'boolean')) continue
    const lines = toLines(value)
    if (lines.length > 0) out.push({ key, label: labelFor(key), lines })
  }
  return out
}

/** Tout le contenu de rules, dans l'ordre du fichier. */
export const ruleSections = (rules: unknown) => sectionsOf(rules, new Set(), false)
/** Champs textes d'une séance qui n'ont pas d'emplacement dédié. */
export const sessionExtras = (session: unknown) => sectionsOf(session, SESSION_HANDLED, true)
/** Champs textes d'un exercice qui n'ont pas d'emplacement dédié. */
export const exerciseExtras = (exercise: unknown) => sectionsOf(exercise, EXERCISE_HANDLED, true)
