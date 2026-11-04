import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ExerciseMedia from '../components/ExerciseMedia'
import FinishSheet from '../components/FinishSheet'
import RpeSheet from '../components/RpeSheet'
import Stepper from '../components/Stepper'
import { db } from '../db'
import { exerciseFrames } from '../media'
import { formatRIR } from '../program'
import { unlockAudio, useTimer } from '../timer'
import type { ExerciseLog, SetLog, Workout } from '../types'
import { useWakeLock } from '../wakeLock'
import { WARMUP_REST_SEC, formatPerf, groupSupersets, lastPerformance, newEmptySet, progressionSuggestion, roundKg, type LastPerformance } from '../workout'

interface Perf {
  last: LastPerformance | null
  suggestion: number | null
}

const workOf = (e: ExerciseLog) => e.sets.filter((s) => s.type === 'work')
const isComplete = (e: ExerciseLog) => workOf(e).length > 0 && workOf(e).every((s) => s.done)
const showNum = (v: number | null) => (v == null ? '–' : String(v).replace('.', ','))
const nameOf = (e: ExerciseLog) => (e.usedSubstitute ? (e.exercise.substitute ?? e.exercise.name) : e.exercise.name)

function firstIncomplete(w: Workout): number {
  const i = w.exercises.findIndex((e) => !isComplete(e))
  return i === -1 ? w.exercises.length - 1 : i
}

/** Exercice à afficher après une série : le partenaire en superset, ou le suivant si celui-ci est fini. */
function nextIndex(w: Workout, index: number, set: SetLog): number {
  const log = w.exercises[index]
  const group = log.exercise.supersetGroup
  if (group && set.type === 'work') {
    const members = w.exercises.map((e, i) => ({ e, i })).filter(({ e }) => e.exercise.supersetGroup === group)
    const pos = members.findIndex((m) => m.i === index)
    for (let k = 1; k <= members.length; k++) {
      const candidate = members[(pos + k) % members.length]
      if (!isComplete(candidate.e)) return candidate.i
    }
  }
  if (!isComplete(log)) return index
  for (let k = 1; k <= w.exercises.length; k++) {
    const i = (index + k) % w.exercises.length
    if (!isComplete(w.exercises[i])) return i
  }
  return index
}

function restText(sec: number) {
  if (sec <= 0) return 'pas de repos, enchaîne'
  const m = Math.floor(sec / 60), s = sec % 60
  return `repos ${m ? `${m} min` : ''}${s ? ` ${s}${m ? '' : ' s'}` : ''}`.trim()
}

export default function WorkoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const timer = useTimer()
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined)
  const ref = useRef<Workout | null>(null)
  const [perf, setPerf] = useState<Record<string, Perf>>({})
  const [findLoad, setFindLoad] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rpeOpen, setRpeOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
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
      const stored = await db.programs.get('active')
      if (!cancelled) setFindLoad(stored?.program.rules.findLoad ?? null)
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

  // Garde la série active visible au-dessus de la console.
  useEffect(() => {
    document.querySelector('.set-line.selected')?.scrollIntoView({ block: 'nearest' })
  })

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

  function goTo(i: number) {
    setSelectedId(null)
    update((w) => ({ ...w, currentExercise: i }))
    window.scrollTo(0, 0)
  }

  if (workout === undefined) return null
  if (workout === null)
    return (
      <div className="page">
        <div className="topbar"><Link to="/" className="back">‹</Link><h1>Séance introuvable</h1></div>
      </div>
    )

  const index = Math.min(workout.currentExercise ?? firstIncomplete(workout), workout.exercises.length - 1)
  const log = workout.exercises[index]
  const ex = log.exercise
  const workSets = workOf(log)
  const warmSets = log.sets.filter((s) => s.type === 'warmup')
  const selected =
    log.sets.find((s) => s.id === selectedId) ?? (isComplete(log) ? null : (log.sets.find((s) => !s.done) ?? null))
  const frames = log.usedSubstitute ? null : exerciseFrames(ex.id)
  const p = perf[log.exerciseId]
  const needsLoad = !!p && !p.last && ex.startWeightKg == null
  const tips = needsLoad && findLoad ? [findLoad, ...ex.tips] : ex.tips
  const allDone = workout.exercises.every(isComplete)
  const elapsedMin = Math.max(0, Math.round(((workout.endedAt ?? Date.now()) - workout.startedAt) / 60000))
  const partners = ex.supersetGroup
    ? workout.exercises.filter((e) => e.exercise.supersetGroup === ex.supersetGroup && e !== log)
    : []

  function patchSet(setId: string, patch: Partial<SetLog>) {
    const current = ref.current!.exercises[index]
    setExercise(index, { ...current, sets: current.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })
  }

  function toggleDone(set: SetLog) {
    unlockAudio()
    if (set.done) {
      patchSet(set.id, { done: false, doneAt: null })
      setSelectedId(set.id)
      return
    }
    // Reporte charge et reps sur les séries suivantes encore vides, sans écraser ce qui est pré-rempli.
    const current = ref.current!.exercises[index]
    const pos = current.sets.findIndex((s) => s.id === set.id)
    const sets = current.sets.map((s, i) => {
      if (s.id === set.id) return { ...s, done: true, doneAt: Date.now() }
      if (i > pos && !s.done && s.type === 'work' && set.type === 'work')
        return { ...s, weightKg: s.weightKg ?? set.weightKg, reps: s.reps ?? set.reps }
      return s
    })
    const updated = { ...current, sets }
    setExercise(index, updated)
    const w = ref.current!
    const dest = nextIndex(w, index, set)
    const after = sets.slice(pos + 1).find((s) => !s.done)
    setSelectedId(dest === index && after ? after.id : null)
    if (dest !== index) goTo(dest)

    if (w.status !== 'in_progress') return
    const rest = set.type === 'warmup' ? Math.min(WARMUP_REST_SEC, ex.restSec) : ex.restSec
    if (rest > 0) {
      const destLog = w.exercises[dest]
      const nextSet = dest === index ? after : undefined
      const label = nextSet
        ? `Ensuite : ${nextSet.type === 'warmup' ? 'échauffement' : 'série'} ${sets.filter((x) => x.type === nextSet.type).indexOf(nextSet) + 1}`
        : dest === index ? 'Dernier exercice terminé' : `Ensuite : ${nameOf(destLog)}`
      timer.start(rest, label)
    }
  }

  async function toggleSubstitute() {
    const w = ref.current
    if (!w) return
    const current = w.exercises[index]
    const usedSubstitute = !current.usedSubstitute
    const last = await lastPerformance(current.exerciseId, usedSubstitute, w.id)
    let sets = current.sets
    if (current.sets.every((s) => !s.done)) {
      let i = 0
      sets = current.sets.map((s) => {
        if (s.type !== 'work') return s
        const src = last ? (last.sets[i] ?? last.sets[last.sets.length - 1]) : null
        i++
        const weightKg = src ? src.weightKg : usedSubstitute ? null : current.exercise.startWeightKg
        return { ...s, weightKg, reps: src ? src.reps : weightKg == null ? current.exercise.repMin : null, rpe: null }
      })
    }
    setPerf((old) => ({ ...old, [current.exerciseId]: { last, suggestion: progressionSuggestion(current.exercise, last) } }))
    setExercise(index, { ...current, usedSubstitute, sets })
  }

  function applySuggestion() {
    if (p?.suggestion == null) return
    const weightKg = p.suggestion
    const current = ref.current!.exercises[index]
    setExercise(index, {
      ...current,
      sets: current.sets.map((s) => (s.type === 'work' && !s.done ? { ...s, weightKg, reps: ex.repMin } : s)),
    })
    setPerf((old) => ({ ...old, [current.exerciseId]: { ...old[current.exerciseId], suggestion: null } }))
  }

  function addSet() {
    const current = ref.current!.exercises[index]
    const added = newEmptySet(workOf(current)[workOf(current).length - 1])
    setExercise(index, { ...current, sets: [...current.sets, added] })
    setSelectedId(added.id)
  }

  function removeSet() {
    const current = ref.current!.exercises[index]
    const work = workOf(current)
    if (work.length <= 1) return
    const target = [...work].reverse().find((s) => !s.done) ?? work[work.length - 1]
    setExercise(index, { ...current, sets: current.sets.filter((s) => s.id !== target.id) })
    if (selectedId === target.id) setSelectedId(null)
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

  const missing = !selected ? null : selected.weightKg == null ? 'kg' : selected.reps == null ? 'reps' : null
  const setLabel = (s: SetLog) => (s.type === 'warmup' ? `E${warmSets.indexOf(s) + 1}` : String(workSets.indexOf(s) + 1))
  const renderLine = (s: SetLog) => (
    <button key={s.id} className={`set-line ${s.done ? 'done' : ''} ${selected?.id === s.id ? 'selected' : ''}`} onClick={() => setSelectedId(s.id)}>
      <span className="n">{setLabel(s)}</span>
      <span className="v">{showNum(s.weightKg)} × {showNum(s.reps)}</span>
      {s.rpe != null && <span className="r">RPE {showNum(s.rpe)}</span>}
      <span className="t">{s.done ? '✓' : ''}</span>
    </button>
  )

  const nextIdx = workout.exercises.findIndex((e, i) => i > index && !isComplete(e))
  const anyIdx = nextIdx !== -1 ? nextIdx : workout.exercises.findIndex((e) => !isComplete(e))

  return (
    <div className="page workout">
      <div className="workout-head">
        <Link to="/" className="back" aria-label="Accueil">‹</Link>
        <div className="workout-name">{workout.sessionName}<br />{workout.weekLabel}, RIR {formatRIR(workout.targetRIR)}, {elapsedMin} min</div>
        <button className="btn btn-sm" onClick={() => setPlanOpen(true)}>Plan</button>
      </div>

      <div className="segments" role="group" aria-label={`Exercice ${index + 1} sur ${workout.exercises.length}`}>
        {workout.exercises.map((e, i) => {
          const nextLinked = !!e.exercise.supersetGroup && workout.exercises[i + 1]?.exercise.supersetGroup === e.exercise.supersetGroup
          const state = i === index ? 'now' : isComplete(e) ? 'full' : e.sets.some((s) => s.done) ? 'part' : ''
          return (
            <button key={i} className={`segment ${state} ${nextLinked ? 'linked' : ''}`} onClick={() => goTo(i)} aria-label={nameOf(e)}><i /></button>
          )
        })}
      </div>

      <div className="ex-title">{ex.reference && <span className="star" aria-label="Exercice repère">★ </span>}{nameOf(log)}</div>
      {log.usedSubstitute && <div className="ex-replaces">Remplace : {ex.name}</div>}
      <div className="ex-meta">
        {ex.muscle[0].toUpperCase() + ex.muscle.slice(1)}. {workSets.length} × {ex.repMin} à {ex.repMax} reps{ex.perSide ? ' par bras' : ''}, {restText(ex.restSec)}.
      </div>
      {partners.length > 0 && <div className="superset-note">Superset {ex.supersetGroup} avec {partners.map(nameOf).join(', ')}.</div>}

      {frames && <ExerciseMedia frames={frames} alt={ex.name} />}

      {p?.last ? (
        <div className="ex-last">Dernière fois : <b>{formatPerf(p.last.sets, ex.perSide)}</b></div>
      ) : (
        <div className="ex-last muted">Première fois.{ex.startNote && ex.startWeightKg != null ? ` ${ex.startNote}.` : ''}</div>
      )}

      {p?.suggestion != null && !log.usedSubstitute && (
        <div className="ex-suggest">
          <span>Monte à {showNum(roundKg(p.suggestion))} kg</span>
          <button className="btn btn-sm btn-primary" onClick={applySuggestion}>Appliquer</button>
        </div>
      )}

      {warmSets.length > 0 && <><div className="set-group-title">Échauffement (0 kg = barre seule ou poids du corps)</div>{warmSets.map(renderLine)}</>}
      <div className="set-group-title">Séries de travail</div>
      {workSets.map(renderLine)}

      <div className="ex-tools">
        <button className="btn btn-sm" onClick={addSet}>Ajouter une série</button>
        <button className="btn btn-sm" onClick={removeSet} disabled={workSets.length <= 1}>Retirer une série</button>
        {ex.mediaUrl && <a className="btn btn-sm" href={ex.mediaUrl} target="_blank" rel="noreferrer">Voir la vidéo</a>}
        {ex.substitute && (
          <button className="btn btn-sm" onClick={() => void toggleSubstitute()}>
            {log.usedSubstitute ? 'Revenir à l’original' : 'Utiliser le remplaçant'}
          </button>
        )}
      </div>
      {ex.substitute && !log.usedSubstitute && <div className="ex-sub">Remplaçant : {ex.substitute}</div>}

      {tips.length > 0 && (
        <details key={`tips-${index}-${needsLoad}`} open={needsLoad}>
          <summary>Conseils</summary>
          <ul className="tips">{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}
      <details key={`note-${index}`}>
        <summary>{log.note ? 'Note enregistrée' : 'Ajouter une note'}</summary>
        <textarea defaultValue={log.note} placeholder="Réglage du siège, sensation, douleur" onChange={(e) => setExercise(index, { ...ref.current!.exercises[index], note: e.target.value })} />
      </details>

      <div className="console">
        <div className="console-inner">
          {selected ? (
            <>
              <div className="console-label">
                {selected.type === 'warmup'
                  ? `Échauffement ${warmSets.indexOf(selected) + 1} sur ${warmSets.length}`
                  : `Série ${workSets.indexOf(selected) + 1} sur ${workSets.length}, vise ${ex.repMin} à ${ex.repMax} reps`}
              </div>
              {selected.weightKg == null && ex.startNote && !log.usedSubstitute && <div className="console-hint">{ex.startNote}</div>}
              <Stepper key={`w-${selected.id}`} field="kg" unit="kg" inputMode="decimal" step={ex.incrementKg} value={selected.weightKg} onChange={(v) => patchSet(selected.id, { weightKg: v })} />
              <Stepper key={`r-${selected.id}`} field="reps" unit={ex.perSide ? 'reps par bras' : 'reps'} inputMode="numeric" step={1} base={ex.repMin} value={selected.reps} onChange={(v) => patchSet(selected.id, { reps: v })} />
              <div className="console-actions">
                {selected.type === 'work' && (
                  <button className="rpe-btn" onClick={() => setRpeOpen(true)}>
                    RPE<b>{selected.rpe == null ? '–' : showNum(selected.rpe)}</b>
                  </button>
                )}
                <button
                  className={`do-btn ${selected.done ? 'undo' : ''}`}
                  onClick={() => {
                    if (!selected.done && missing) document.querySelector<HTMLInputElement>(`.stepper input[data-field="${missing}"]`)?.focus()
                    else toggleDone(selected)
                  }}
                >
                  {selected.done ? 'Annuler cette série' : missing === 'kg' ? 'Indiquer la charge' : missing === 'reps' ? 'Indiquer les reps' : 'Série faite'}
                </button>
              </div>
            </>
          ) : allDone || anyIdx === -1 ? (
            workout.status === 'in_progress' ? (
              <button className="do-btn next btn-block" style={{ width: '100%' }} onClick={() => setFinishing(true)}>Terminer la séance</button>
            ) : (
              <Link to="/" className="btn btn-xl">Retour à l’accueil</Link>
            )
          ) : (
            <button className="do-btn next" style={{ width: '100%' }} onClick={() => goTo(anyIdx)}>
              Exercice suivant<small>{nameOf(workout.exercises[anyIdx])}</small>
            </button>
          )}
        </div>
      </div>

      {planOpen && (
        <div className="sheet-backdrop" onClick={() => { setPlanOpen(false); setConfirmAbandon(false) }}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{workout.sessionName}</h2>
            {groupSupersets(workout.exercises).map((g, gi) => {
              const rows = g.items.map(({ log: l, index: i }) => (
                <button key={i} className={`plan-row ${i === index ? 'now' : ''} ${isComplete(l) ? 'complete' : ''}`} onClick={() => { goTo(i); setPlanOpen(false) }}>
                  <span>{l.exercise.reference ? '★ ' : ''}{nameOf(l)}</span>
                  <small>{workOf(l).filter((s) => s.done).length} sur {workOf(l).length}</small>
                </button>
              ))
              return g.group ? (
                <div className="plan-group" key={gi}>
                  <div className="plan-group-title">Superset {g.group}</div>
                  {rows}
                </div>
              ) : <div key={gi}>{rows}</div>
            })}
            {workout.status === 'in_progress' && (
              <div className="stack" style={{ marginTop: 14 }}>
                <button className="btn btn-ok btn-lg btn-block" onClick={() => { setPlanOpen(false); setFinishing(true) }}>Terminer la séance</button>
                {confirmAbandon ? (
                  <div className="alert alert-warn" style={{ marginBottom: 0 }}>
                    Supprimer cette séance et tout ce qui a été saisi ?
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn btn-danger grow" onClick={() => void abandon()}>Supprimer la séance</button>
                      <button className="btn grow" onClick={() => setConfirmAbandon(false)}>Garder</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-block" onClick={() => setConfirmAbandon(true)}>Supprimer la séance</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {rpeOpen && selected && <RpeSheet value={selected.rpe} onSelect={(v) => patchSet(selected.id, { rpe: v })} onClose={() => setRpeOpen(false)} />}
      {finishing && <FinishSheet defaultDurationMin={elapsedMin} onConfirm={finish} onClose={() => setFinishing(false)} />}
    </div>
  )
}
