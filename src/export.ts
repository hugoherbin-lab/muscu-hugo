import { db, setSetting } from './db'
import { isoDate } from './program'
import { markSeedApplied } from './seed'
import type { Program, Setting, StoredProgram, Workout } from './types'

export const BACKUP_SCHEMA = 'muscu-hugo-backup'

export interface Backup {
  schema: typeof BACKUP_SCHEMA
  version: number
  exportedAt: string
  program: Program | null
  workouts: Workout[]
  settings: Setting[]
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: unknown[][]): string {
  // BOM UTF-8 pour Excel/Numbers, séparateur virgule, fin de ligne CRLF.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const JOURNAL_HEADER = [
  'date', 'semaine', 'seance_id', 'seance_nom', 'exercice_id', 'exercice_nom', 'remplacant_utilise',
  'type_serie', 'numero_serie', 'charge_kg', 'reps', 'rpe', 'note_exercice', 'douleur_epaule', 'duree_seance_min',
]

export function journalRows(workouts: Workout[]): unknown[][] {
  const rows: unknown[][] = [JOURNAL_HEADER]
  const sorted = [...workouts].filter((w) => w.status === 'done').sort((a, b) => a.startedAt - b.startedAt)
  for (const w of sorted) {
    const date = isoDate(new Date(w.startedAt))
    for (const ex of w.exercises) {
      let warm = 0, work = 0
      for (const s of ex.sets) {
        if (!s.done) continue
        const num = s.type === 'warmup' ? ++warm : ++work
        rows.push([
          date, w.weekLabel, w.sessionId, w.sessionName, ex.exerciseId,
          ex.usedSubstitute ? (ex.exercise.substitute ?? ex.exercise.name) : ex.exercise.name,
          ex.usedSubstitute ? 'oui' : 'non',
          s.type === 'warmup' ? 'echauffement' : 'travail', num,
          s.weightKg, s.reps, s.rpe, ex.note, w.shoulderPain, w.durationMin,
        ])
      }
    }
  }
  return rows
}

export async function buildBackup(): Promise<Backup> {
  const stored = await db.programs.get('active')
  const workouts = await db.workouts.toArray()
  const settings = (await db.settings.toArray()).filter((s) => s.key !== 'timer')
  return { schema: BACKUP_SCHEMA, version: 1, exportedAt: new Date().toISOString(), program: stored?.program ?? null, workouts, settings }
}

export async function restoreBackup(raw: unknown): Promise<{ workouts: number; hasProgram: boolean }> {
  if (!raw || typeof raw !== 'object') throw new Error('Le fichier n’est pas une sauvegarde JSON valide.')
  const b = raw as Partial<Backup>
  if (b.schema !== BACKUP_SCHEMA) throw new Error('Ce fichier n’est pas une sauvegarde Muscu Hugo (champ "schema" absent ou différent).')
  if (!Array.isArray(b.workouts)) throw new Error('Sauvegarde incomplète : "workouts" manquant.')
  await db.transaction('rw', db.programs, db.workouts, db.settings, async () => {
    await db.programs.clear()
    await db.workouts.clear()
    await db.settings.clear()
    if (b.program) {
      const stored: StoredProgram = { id: 'active', program: b.program, importedAt: Date.now() }
      await db.programs.put(stored)
    }
    await db.workouts.bulkPut(b.workouts as Workout[])
    if (Array.isArray(b.settings)) await db.settings.bulkPut(b.settings as Setting[])
  })
  if (b.program) await markSeedApplied()
  return { workouts: (b.workouts as Workout[]).length, hasProgram: !!b.program }
}

/** Partage via la feuille iPhone si possible, sinon téléchargement. Renvoie "share" ou "download". */
export async function shareOrDownload(filename: string, content: string, mime: string): Promise<'share' | 'download'> {
  const blob = new Blob([content], { type: mime })
  const file = new File([blob], filename, { type: mime })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'share'
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      // sinon on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'download'
}

export async function exportJournalCsv(): Promise<'share' | 'download'> {
  const workouts = await db.workouts.toArray()
  const csv = toCsv(journalRows(workouts))
  return shareOrDownload(`journal-${isoDate()}.csv`, csv, 'text/csv;charset=utf-8')
}

export async function exportBackupJson(): Promise<'share' | 'download'> {
  const backup = await buildBackup()
  const result = await shareOrDownload(`muscu-hugo-sauvegarde-${isoDate()}.json`, JSON.stringify(backup, null, 2), 'application/json')
  await setSetting('lastBackupAt', Date.now())
  return result
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Impossible de lire le fichier.'))
    r.readAsText(file, 'utf-8')
  })
}

// Accès de débogage en développement uniquement (jamais inclus dans la version publiée).
if (import.meta.env.DEV) {
  ;(window as unknown as { __muscu: unknown }).__muscu = { db, buildBackup, journalRows, toCsv, restoreBackup }
}
