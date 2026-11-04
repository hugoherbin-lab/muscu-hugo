import { isoDate } from './program'
import type { Program, Session, Week, Workout } from './types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Séances non prévues cette semaine, lues dans la note de la semaine : « pas de Pecs » retire la séance pecs.
 * Le format du programme n'a pas de champ dédié, d'où cette lecture du texte.
 */
export function excludedSessionIds(program: Program, week: Week): Set<string> {
  const out = new Set<string>()
  for (const m of norm(week.note ?? '').matchAll(/(?:pas de|sans)\s+([a-z ,'-]+)/g)) {
    const words = m[1].split(/[^a-z]+/)
    for (const s of program.sessions) {
      if (words.includes(norm(s.id)) || words.includes(norm(s.name).split(/[^a-z]+/)[0])) out.add(s.id)
    }
  }
  // Une note ne doit jamais vider la semaine entière.
  return out.size >= program.cycleOrder.length ? new Set() : out
}

export function isInWeek(ts: number, week: Week): boolean {
  const d = isoDate(new Date(ts))
  return week.start <= d && d <= week.end
}

export interface CycleRow {
  session: Session
  excluded: boolean
  doneWorkout: Workout | null
  inProgress: Workout | null
}

export interface WeekProgress {
  rows: CycleRow[]
  doneCount: number
  plannedCount: number
  next: Session | null
}

/** État de la semaine : les séances du cycle, ce qui est fait, ce qui est en cours et la prochaine à faire. */
export function weekProgress(program: Program, week: Week, done: Workout[], inProgress: Workout[]): WeekProgress {
  const excluded = excludedSessionIds(program, week)
  const latest = (list: Workout[]) => [...list].sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
  const rows: CycleRow[] = program.cycleOrder
    .map((id) => program.sessions.find((s) => s.id === id))
    .filter((s): s is Session => !!s)
    .map((session) => ({
      session,
      excluded: excluded.has(session.id),
      doneWorkout: latest(done.filter((w) => w.sessionId === session.id && isInWeek(w.startedAt, week))),
      inProgress: latest(inProgress.filter((w) => w.sessionId === session.id)),
    }))
  const planned = rows.filter((r) => !r.excluded)

  // Suivante dans le cycle après la dernière séance terminée : on saute ce qui n'est pas prévu ou déjà fait cette semaine.
  const last = latest(done)
  const start = last ? rows.findIndex((r) => r.session.id === last.sessionId) : -1
  const ordered = rows.map((_, k) => rows[(start + 1 + k) % rows.length])
  const next = ordered.find((r) => !r.excluded && !r.doneWorkout) ?? ordered.find((r) => !r.excluded) ?? null

  return { rows, doneCount: planned.filter((r) => r.doneWorkout).length, plannedCount: planned.length, next: next?.session ?? null }
}
