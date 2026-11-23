import raw from '../programme-seche.json'
import { db, getSetting, setSetting } from './db'
import { validateProgram } from './program'
import type { StoredProgram } from './types'

const SEED_KEY = 'seedProgramHash'

/** Empreinte du programme embarqué : elle change seulement quand le fichier fourni avec l'app change. */
function seedHash(): string {
  const text = JSON.stringify(raw)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/**
 * Le programme embarqué remplace-t-il celui du téléphone ?
 * - Programme venu de l'app elle-même : oui, la livraison la plus récente fait foi.
 * - Programme importé à la main ou restauré : seulement si l'embarqué a un numéro de version strictement supérieur.
 */
export function embeddedReplaces(stored: Pick<StoredProgram, 'source' | 'program'>, embeddedVersion: unknown): boolean {
  if (stored.source !== 'import' && stored.source !== 'restore') return true
  const mine = Number(stored.program.version)
  const theirs = Number(embeddedVersion)
  return Number.isFinite(mine) && Number.isFinite(theirs) && theirs > mine
}

/**
 * Charge le programme embarqué au premier lancement, puis une seule fois à chaque nouvelle livraison,
 * sans jamais écraser un programme importé plus récent. Le journal n'est jamais touché.
 */
export async function seedProgram(): Promise<void> {
  const hash = seedHash()
  const stored = await db.programs.get('active')
  if (stored && (await getSetting<string>(SEED_KEY)) === hash) return
  if (!stored || embeddedReplaces(stored, (raw as { version?: unknown }).version)) {
    await db.programs.put({ id: 'active', program: validateProgram(raw), importedAt: Date.now(), source: 'seed' })
  }
  // Livraison vue : elle ne sera plus proposée, même si le programme du téléphone a été gardé.
  await setSetting(SEED_KEY, hash)
}

/** Après une restauration : oublie la livraison déjà vue et réapplique la règle au programme restauré. */
export async function reseedAfterRestore(): Promise<void> {
  await setSetting(SEED_KEY, null)
  await seedProgram()
}
