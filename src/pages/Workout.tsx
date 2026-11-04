import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import FinishSheet from '../components/FinishSheet'
import { db } from '../db'
import { formatDateTime, formatRIR } from '../program'
import { useTimer } from '../timer'
import type { ExerciseLog, Workout } from '../types'
import { useWakeLock } from '../wakeLock'
import { groupSupersets, lastPerformance, progressionSuggestion, workoutSetsDone, type LastPerformance } from '../workout'

interface Perf {
  last: LastPerformance | null
  suggestion: number | null
}

export default function WorkoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const timer = useTimer()
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined)
  const ref = useRef<Workout | null>(null)
  const [perf, setPerf] = useState<Record<string, Perf>>({})
  const [finishing, setFinishing] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [, setTick] = useState(0)

  useWakeLock(workout?.status === 'in_progress')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    db.workouts.get(id).then(async (w) => {
      if (cancelled) return
      if (!w) {
        setWorkout(null)
        return
      }
      ref.current = w
      setWorkout(w)
      const p: Record<string, Perf> = {}
      for (const ex of w.exercises) {
        const last = await lastPerformance(ex.exerciseId, ex.usedSubstitute, w.id)
        p[ex.exerciseId] = { last, suggestion: progressionSuggestion(ex.exercise, last) }
      }
      if (!cancelled) setPerf(p)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  // Durée affichée en direct
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  function update(fn: (w: Workout) => Workout) {
    if (!ref.current) return
    const next = fn(ref.current)
    ref.current = next
    setWorkout(next)
    void db.workouts.put(next)
  }

  function setExercise(index: number, log: ExerciseLog) {
    update((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === index ? log : e)) }))
  }

  async function toggleSubstitute(index: number) {
    const w = ref.current
    if (!w) return
    const log = w.exercises[index]
    const usedSubstitute = !log.usedSubstitute
    const last = await lastPerformance(log.exerciseId, usedSubstitute, w.id)
    const nothingDone = log.sets.every((s) => !s.done)
    let sets = log.sets
    if (nothingDone) {
      // Re-pré-remplit les séries de travail avec l'historique de cette variante.
      let i = 0
      sets = log.sets.map((s) => {
        if (s.type !== 'work') return s
        const src = last ? (last.sets[i] ?? last.sets[last.sets.length - 1]) : null
        i++
        return { ...s, weightKg: src ? src.weightKg : usedSubstitute ? null : log.exercise.startWeightKg, reps: src ? src.reps : null, rpe: null }
      })
    }
    setPerf((p) => ({ ...p, [log.exerciseId]: { last, suggestion: progressionSuggestion(log.exercise, last) } }))
    setExercise(index, { ...log, usedSubstitute, sets })
  }

  function finish(data: { shoulderPain: number | null; note: string; durationMin: number }) {
    update((w) => ({ ...w, ...data, status: 'done', endedAt: Date.now() }))
    timer.skip()
    setFinishing(false)
    navigate('/')
  }

  async function abandon() {
    if (!ref.current) return
    await db.workouts.delete(ref.current.id)
    timer.skip()
    navigate('/')
  }

  if (workout === undefined) return null
  if (workout === null)
    return (
      <div className="page">
        <div className="topbar"><Link to="/" className="back">‹ Accueil</Link><h1>Séance introuvable</h1></div>
      </div>
    )

  const elapsedMin = Math.max(0, Math.round(((workout.endedAt ?? Date.now()) - workout.startedAt) / 60000))
  const groups = groupSupersets(workout.exercises)
  const totalWork = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.type === 'work').length, 0)
  const doneWork = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.type === 'work' && s.done).length, 0)

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="back">‹</Link>
        <h1>{workout.sessionName}</h1>
      </div>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <span className="badge accent">{workout.weekLabel} · RIR {formatRIR(workout.targetRIR)}</span>
        <span className="badge">{elapsedMin} min</span>
        <span className="badge">{doneWork}/{totalWork} séries</span>
        {workout.status === 'done' && <span className="badge ok">Terminée</span>}
      </div>
      {workout.status === 'done' && (
        <p className="muted small">Séance du {formatDateTime(workout.startedAt)}. Les modifications sont enregistrées automatiquement.</p>
      )}

      {groups.map((g, gi) =>
        g.group ? (
          <div className="superset" key={gi}>
            <div className="superset-title">Superset {g.group} · enchaîner, repos après le dernier</div>
            {g.items.map(({ log, index }) => (
              <ExerciseCard
                key={index}
                log={log}
                targetRIR={workout.targetRIR}
                last={perf[log.exerciseId]?.last ?? null}
                suggestion={perf[log.exerciseId]?.suggestion ?? null}
                onChange={(l) => setExercise(index, l)}
                onToggleSubstitute={() => void toggleSubstitute(index)}
              />
            ))}
          </div>
        ) : (
          g.items.map(({ log, index }) => (
            <ExerciseCard
              key={index}
              log={log}
              targetRIR={workout.targetRIR}
              last={perf[log.exerciseId]?.last ?? null}
              suggestion={perf[log.exerciseId]?.suggestion ?? null}
              onChange={(l) => setExercise(index, l)}
              onToggleSubstitute={() => void toggleSubstitute(index)}
            />
          ))
        ),
      )}

      {workout.status === 'in_progress' && (
        <div className="card">
          {confirmAbandon ? (
            <div className="alert alert-warn" style={{ marginBottom: 0 }}>
              Supprimer cette séance et tout ce qui a été saisi ?
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-danger grow" onClick={() => void abandon()}>Oui, supprimer</button>
                <button className="btn grow" onClick={() => setConfirmAbandon(false)}>Non</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-block small" onClick={() => setConfirmAbandon(true)}>Abandonner la séance (supprimer)</button>
          )}
        </div>
      )}

      {workout.status === 'in_progress' && (
        <div className="sticky-bottom">
          <button className="btn btn-ok btn-xl" onClick={() => setFinishing(true)}>
            Terminer la séance{workoutSetsDone(workout) === 0 ? '' : ` (${doneWork}/${totalWork})`}
          </button>
        </div>
      )}

      {finishing && <FinishSheet defaultDurationMin={elapsedMin} onConfirm={finish} onClose={() => setFinishing(false)} />}
    </div>
  )
}
