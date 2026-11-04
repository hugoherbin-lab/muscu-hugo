import raw from '../programme-seche.json'
import { db, getSetting, setSetting } from './db'
import { validateProgram } from './program'

const SEED_KEY = 'seedProgramHash'

/** Empreinte du programme embarqué : elle change seulement quand le fichier fourni avec l'app change. */
function seedHash(): string {
  const text = JSON.stringify(raw)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/**
 * Charge le programme embarqué au premier lancement, ou une seule fois quand une nouvelle version
 * est livrée avec l'app. Le journal n'est jamais touché. Un programme importé à la main reste en place
 * tant que le fichier embarqué ne change pas.
 */
export async function seedProgram(): Promise<void> {
  const hash = seedHash()
  if ((await getSetting<string>(SEED_KEY)) === hash && (await db.programs.get('active'))) return
  await db.programs.put({ id: 'active', program: validateProgram(raw), importedAt: Date.now() })
  await setSetting(SEED_KEY, hash)
}

/** Après une restauration, le programme de la sauvegarde prime : il ne doit pas être remplacé au lancement suivant. */
export async function markSeedApplied(): Promise<void> {
  await setSetting(SEED_KEY, seedHash())
}
