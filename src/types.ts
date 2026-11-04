// ---- Format du programme (programme-seche.json) : format de référence, jamais modifié ----
export interface WarmupSet {
  weightKg: number
  reps: number
}

export interface Exercise {
  id: string
  name: string
  muscle: string
  sets: number
  repMin: number
  repMax: number
  restSec: number
  warmup: WarmupSet[]
  startWeightKg: number | null
  startNote: string | null
  incrementKg: number
  perSide: boolean
  reference: boolean
  supersetGroup: string | null
  substitute: string | null
  tips: string[]
  mediaUrl: string | null
}

export interface Session {
  id: string
  name: string
  order: number
  defaultDay?: string
  exercises: Exercise[]
}

export interface Week {
  label: string
  start: string
  end: string
  targetRIR: number
  note: string
  setsMultiplier: number
}

export interface Program {
  schema: string
  version: number
  programName: string
  startDate: string
  gym?: string
  cycleOrder: string[]
  weeks: Week[]
  rules: {
    progression?: string
    tempo?: string
    shoulderPain?: { range: string; action: string }[]
    [key: string]: unknown
  }
  dailyScore: string[]
  sessions: Session[]
}

// ---- Journal ----
export type SetType = 'warmup' | 'work'

export interface SetLog {
  id: string
  type: SetType
  weightKg: number | null
  reps: number | null
  rpe: number | null
  done: boolean
  doneAt: number | null
}

export interface ExerciseLog {
  exerciseId: string
  /** Copie de la définition au moment de la séance (le journal reste lisible même si le programme change). */
  exercise: Exercise
  usedSubstitute: boolean
  note: string
  sets: SetLog[]
}

export type WorkoutStatus = 'in_progress' | 'done'

export interface Workout {
  id: string
  sessionId: string
  sessionName: string
  weekLabel: string
  targetRIR: number
  startedAt: number
  endedAt: number | null
  status: WorkoutStatus
  shoulderPain: number | null
  note: string
  durationMin: number | null
  exercises: ExerciseLog[]
}

export interface StoredProgram {
  id: 'active'
  program: Program
  importedAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export interface TimerState {
  endAt: number
  totalSec: number
  label: string
}
