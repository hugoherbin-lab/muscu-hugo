import { db, uid } from './db'
import { weekForDate, workSetCount } from './program'
import type { Exercise, ExerciseLog, Program, Session, SetLog, Week, Workout } from './types'

export const WARMUP_REST_SEC = 60

/** Dernière performance enregistrée sur un exercice (même variante : original ou remplaçant). */
export interface LastPerformance {
  workoutId: string
  startedAt: number
  weekLabel: string
  targetRIR: number
  sets: SetLog[] // séries de travail faites
}

export async function lastPerformance(
  exerciseId: string,
  usedSubstitute: boolean,
  excludeWorkoutId?: string,
): Promise<LastPerformance | null> {
  const done = await db.workouts.where('status').equals('done').reverse().sortBy('startedAt')
  for (const w of done) {
    if (w.id === excludeWorkoutId) continue
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId && e.usedSubstitute === usedSubstitute)
    if (!ex) continue
    const sets = ex.sets.filter((s) => s.type === 'work' && s.done && s.reps != null)
    if (sets.length === 0) continue
    return { workoutId: w.id, startedAt: w.startedAt, weekLabel: w.weekLabel, targetRIR: w.targetRIR, sets }
  }
  return null
}

/** Suggestion de progression : toutes les séries de la dernière fois à repMax avec RIR ≥ cible. */
export function progressionSuggestion(exercise: Exercise, last: LastPerformance | null): number | null {
  if (!last || last.sets.length === 0) return null
  const allMax = last.sets.every((s) => (s.reps ?? 0) >= exercise.repMax)
  if (!allMax) return null
  const rirOk = last.sets.every((s) => s.rpe == null || 10 - s.rpe >= last.targetRIR)
  if (!rirOk) return null
  const maxW = Math.max(...last.sets.map((s) => s.weightKg ?? 0))
  return roundKg(maxW + exercise.incrementKg)
}

export function roundKg(v: number): number {
  return Math.round(v * 100) / 100
}

export function formatPerf(sets: SetLog[], perSide = false): string {
  return sets.map((s) => `${s.weightKg ?? '–'} × ${s.reps ?? '–'}${perSide ? '/bras' : ''}`).join(' · ')
}

function makeWarmupSets(exercise: Exercise): SetLog[] {
  return exercise.warmup.map((w) => ({ id: uid(), type: 'warmup', weightKg: w.weightKg, reps: w.reps, rpe: null, done: false, doneAt: null }))
}

/** Pré-remplit les séries de travail : dernière performance, sinon startWeightKg. Sans l'un ni l'autre : reps à repMin, charge vide. */
export function makeWorkSets(exercise: Exercise, week: Week, last: LastPerformance | null): SetLog[] {
  const n = workSetCount(exercise, week)
  const sets: SetLog[] = []
  for (let i = 0; i < n; i++) {
    let weightKg: number | null = exercise.startWeightKg
    let reps: number | null = weightKg == null ? exercise.repMin : null
    if (last) {
      const src = last.sets[i] ?? last.sets[last.sets.length - 1]
      weightKg = src.weightKg
      reps = src.reps
    }
    sets.push({ id: uid(), type: 'work', weightKg, reps, rpe: null, done: false, doneAt: null })
  }
  return sets
}

export async function buildExerciseLog(exercise: Exercise, week: Week, usedSubstitute = false): Promise<ExerciseLog> {
  const last = await lastPerformance(exercise.id, usedSubstitute)
  return {
    exerciseId: exercise.id,
    exercise,
    usedSubstitute,
    note: '',
    sets: [...makeWarmupSets(exercise), ...makeWorkSets(exercise, week, last)],
  }
}

export async function startWorkout(program: Program, session: Session): Promise<Workout> {
  const now = Date.now()
  const week = weekForDate(program, now)
  const exercises: ExerciseLog[] = []
  for (const ex of session.exercises) exercises.push(await buildExerciseLog(ex, week))
  const workout: Workout = {
    id: uid(),
    sessionId: session.id,
    sessionName: session.name,
    weekLabel: week.label,
    targetRIR: week.targetRIR,
    startedAt: now,
    endedAt: null,
    status: 'in_progress',
    shoulderPain: null,
    note: '',
    durationMin: null,
    exercises,
  }
  await db.workouts.put(workout)
  return workout
}

export async function getInProgressWorkout(): Promise<Workout | undefined> {
  const list = await db.workouts.where('status').equals('in_progress').toArray()
  return list.sort((a, b) => b.startedAt - a.startedAt)[0]
}

export async function lastDoneWorkout(): Promise<Workout | undefined> {
  const list = await db.workouts.where('status').equals('done').reverse().sortBy('startedAt')
  return list[0]
}

export function newEmptySet(prev?: SetLog): SetLog {
  return { id: uid(), type: 'work', weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, rpe: null, done: false, doneAt: null }
}

export function workoutWorkSetsDone(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.type === 'work' && s.done).length, 0)
}

export function workoutSetsDone(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
}

/** Regroupe les exercices consécutifs d'un même superset pour l'affichage. */
export function groupSupersets(exercises: ExerciseLog[]): { group: string | null; items: { log: ExerciseLog; index: number }[] }[] {
  const out: { group: string | null; items: { log: ExerciseLog; index: number }[] }[] = []
  exercises.forEach((log, index) => {
    const g = log.exercise.supersetGroup
    const prev = out[out.length - 1]
    if (g && prev && prev.group === g) prev.items.push({ log, index })
    else out.push({ group: g, items: [{ log, index }] })
  })
  return out
}

export interface WorkoutStats {
  durationMin: number
  workSets: number
  warmupSets: number
  /** Total soulevé sur les séries de travail cochées : charge × reps, comme saisi. */
  volumeKg: number
}

export function workoutStats(w: Workout): WorkoutStats {
  let workSets = 0, warmupSets = 0, volumeKg = 0
  for (const e of w.exercises) {
    for (const s of e.sets) {
      if (!s.done) continue
      if (s.type === 'warmup') warmupSets++
      else {
        workSets++
        volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0)
      }
    }
  }
  const elapsed = Math.round(((w.endedAt ?? Date.now()) - w.startedAt) / 60000)
  return { durationMin: w.durationMin ?? Math.max(0, elapsed), workSets, warmupSets, volumeKg: Math.round(volumeKg) }
}
