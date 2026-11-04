import Dexie, { type Table } from 'dexie'
import type { Setting, StoredProgram, Workout } from './types'

export class MuscuDB extends Dexie {
  programs!: Table<StoredProgram, string>
  workouts!: Table<Workout, string>
  settings!: Table<Setting, string>

  constructor() {
    super('muscu-hugo')
    this.version(1).stores({
      programs: 'id',
      workouts: 'id, status, startedAt, sessionId',
      settings: 'key',
    })
  }
}

export const db = new MuscuDB()

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  if (value === undefined || value === null) await db.settings.delete(key)
  else await db.settings.put({ key, value })
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
