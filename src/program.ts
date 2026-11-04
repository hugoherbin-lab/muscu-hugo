import type { Exercise, Program, Session, Week } from './types'

export class ProgramError extends Error {}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown) => typeof v === 'string'

/** Valide le JSON importé et renvoie un Program typé, ou lève une ProgramError en français. */
export function validateProgram(raw: unknown): Program {
  if (!raw || typeof raw !== 'object') throw new ProgramError('Le fichier ne contient pas un objet JSON.')
  const p = raw as Record<string, unknown>
  if (p.schema !== 'hugo-training-program')
    throw new ProgramError(`Format inconnu : "schema" doit valoir "hugo-training-program" (trouvé : ${JSON.stringify(p.schema)}).`)
  if (!isStr(p.programName)) throw new ProgramError('"programName" manquant.')
  if (!Array.isArray(p.cycleOrder) || !p.cycleOrder.every(isStr) || p.cycleOrder.length === 0)
    throw new ProgramError('"cycleOrder" doit être une liste d’identifiants de séances.')
  if (!Array.isArray(p.weeks) || p.weeks.length === 0) throw new ProgramError('"weeks" doit être une liste non vide.')
  p.weeks.forEach((w: Record<string, unknown>, i) => {
    const where = `Semaine n°${i + 1}`
    if (!isStr(w.label)) throw new ProgramError(`${where} : "label" manquant.`)
    if (!isStr(w.start) || !isStr(w.end)) throw new ProgramError(`${where} (${w.label}) : dates "start"/"end" manquantes.`)
    if (!isNum(w.targetRIR)) throw new ProgramError(`${where} (${w.label}) : "targetRIR" manquant.`)
    if (!isNum(w.setsMultiplier)) throw new ProgramError(`${where} (${w.label}) : "setsMultiplier" manquant.`)
  })
  if (!Array.isArray(p.sessions) || p.sessions.length === 0) throw new ProgramError('"sessions" doit être une liste non vide.')
  const ids = new Set<string>()
  p.sessions.forEach((s: Record<string, unknown>, i) => {
    const where = `Séance n°${i + 1}`
    if (!isStr(s.id)) throw new ProgramError(`${where} : "id" manquant.`)
    if (!isStr(s.name)) throw new ProgramError(`${where} (${s.id}) : "name" manquant.`)
    if (ids.has(s.id)) throw new ProgramError(`Identifiant de séance en double : ${s.id}.`)
    ids.add(s.id)
    if (!Array.isArray(s.exercises) || s.exercises.length === 0)
      throw new ProgramError(`Séance ${s.id} : "exercises" doit être une liste non vide.`)
    s.exercises.forEach((e: Record<string, unknown>, j) => {
      const w = `Séance ${s.id}, exercice n°${j + 1}`
      if (!isStr(e.id)) throw new ProgramError(`${w} : "id" manquant.`)
      if (!isStr(e.name)) throw new ProgramError(`${w} (${e.id}) : "name" manquant.`)
      if (!isStr(e.muscle)) throw new ProgramError(`${w} (${e.id}) : "muscle" manquant.`)
      for (const k of ['sets', 'repMin', 'repMax', 'restSec', 'incrementKg'])
        if (!isNum(e[k])) throw new ProgramError(`${w} (${e.id}) : "${k}" manquant ou non numérique.`)
      if (!Array.isArray(e.warmup)) throw new ProgramError(`${w} (${e.id}) : "warmup" doit être une liste.`)
      e.warmup.forEach((ws: Record<string, unknown>, k) => {
        if (!isNum(ws.weightKg) || !isNum(ws.reps))
          throw new ProgramError(`${w} (${e.id}) : série de montée n°${k + 1} invalide.`)
      })
      if (e.startWeightKg !== null && e.startWeightKg !== undefined && !isNum(e.startWeightKg))
        throw new ProgramError(`${w} (${e.id}) : "startWeightKg" doit être un nombre ou null.`)
    })
  })
  for (const id of p.cycleOrder as string[])
    if (!ids.has(id)) throw new ProgramError(`"cycleOrder" cite une séance inconnue : ${id}.`)

  // Normalisation douce des champs optionnels (sans toucher au fichier d'origine).
  // Les champs inconnus sont conservés tels quels (...s, ...e, ...p) : ils s'affichent automatiquement.
  const sessions: Session[] = (p.sessions as Record<string, unknown>[]).map((s) => ({
    ...s,
    id: s.id as string,
    name: s.name as string,
    order: isNum(s.order) ? (s.order as number) : 0,
    defaultDay: isStr(s.defaultDay) ? (s.defaultDay as string) : undefined,
    exercises: (s.exercises as Record<string, unknown>[]).map(
      (e): Exercise => ({
        ...e,
        id: e.id as string,
        name: e.name as string,
        muscle: e.muscle as string,
        sets: e.sets as number,
        repMin: e.repMin as number,
        repMax: e.repMax as number,
        restSec: e.restSec as number,
        warmup: e.warmup as Exercise['warmup'],
        startWeightKg: isNum(e.startWeightKg) ? (e.startWeightKg as number) : null,
        startNote: isStr(e.startNote) ? (e.startNote as string) : null,
        incrementKg: e.incrementKg as number,
        perSide: e.perSide === true,
        reference: e.reference === true,
        supersetGroup: isStr(e.supersetGroup) ? (e.supersetGroup as string) : null,
        substitute: isStr(e.substitute) ? (e.substitute as string) : null,
        tips: Array.isArray(e.tips) ? (e.tips as unknown[]).filter(isStr) as string[] : [],
        mediaUrl: isStr(e.mediaUrl) ? (e.mediaUrl as string) : null,
      }),
    ),
  }))

  return {
    ...p,
    schema: p.schema,
    version: isNum(p.version) ? (p.version as number) : 1,
    programName: p.programName as string,
    startDate: isStr(p.startDate) ? (p.startDate as string) : (p.weeks as Week[])[0].start,
    gym: isStr(p.gym) ? (p.gym as string) : undefined,
    cycleOrder: p.cycleOrder as string[],
    weeks: p.weeks as Week[],
    rules: (p.rules && typeof p.rules === 'object' ? p.rules : {}) as Program['rules'],
    dailyScore: Array.isArray(p.dailyScore) ? (p.dailyScore as unknown[]).filter(isStr) as string[] : [],
    sessions,
  }
}

/** Date locale au format AAAA-MM-JJ. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type WeekPosition = 'before' | 'during' | 'after'

/** Semaine en cours d'après les dates. Avant le début → S0 ; après la fin → dernière semaine. */
export function currentWeek(program: Program, today: string = isoDate()): { week: Week; position: WeekPosition } {
  const weeks = program.weeks
  const found = weeks.find((w) => w.start <= today && today <= w.end)
  if (found) return { week: found, position: 'during' }
  if (today < weeks[0].start) return { week: weeks[0], position: 'before' }
  return { week: weeks[weeks.length - 1], position: 'after' }
}

export function weekForDate(program: Program, ts: number): Week {
  return currentWeek(program, isoDate(new Date(ts))).week
}

/** Nombre de séries de travail à faire cette semaine (décharge : moitié, arrondi au supérieur). */
export function workSetCount(exercise: Exercise, week: Week): number {
  return Math.max(1, Math.ceil(exercise.sets * week.setsMultiplier))
}

/** Prochaine séance dans cycleOrder après la dernière séance terminée. */
export function nextSessionId(program: Program, lastDoneSessionId: string | null): string {
  const order = program.cycleOrder
  if (!lastDoneSessionId) return order[0]
  const i = order.indexOf(lastDoneSessionId)
  if (i === -1) return order[0]
  return order[(i + 1) % order.length]
}

export function sessionById(program: Program, id: string): Session | undefined {
  return program.sessions.find((s) => s.id === id)
}

export function formatRIR(rir: number): string {
  if (rir === 0.5) return '0 à 1'
  return String(rir)
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
export function formatWeekRange(start: string, end: string): string {
  const [, m1, d1] = start.split('-').map(Number)
  const [, m2, d2] = end.split('-').map(Number)
  return m1 === m2 ? `du ${d1} au ${d2} ${MONTHS[m2 - 1]}` : `du ${d1} ${MONTHS[m1 - 1]} au ${d2} ${MONTHS[m2 - 1]}`
}
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export function formatRelativeDay(ts: number): string {
  const today = isoDate()
  const that = isoDate(new Date(ts))
  if (that === today) return "aujourd'hui"
  const diff = Math.round((new Date(today).getTime() - new Date(that).getTime()) / 86400000)
  if (diff === 1) return 'hier'
  if (diff < 7) return `il y a ${diff} jours`
  return formatShortDate(that)
}
