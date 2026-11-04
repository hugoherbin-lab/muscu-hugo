import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SessionStats from '../components/SessionStats'
import { db } from '../db'
import { formatDateTime } from '../program'
import { startWorkout } from '../workout'

const show = (v: number | null) => (v == null ? '–' : String(v).replace('.', ','))

export default function HistoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const workout = useLiveQuery(() => db.workouts.get(id ?? '').then((w) => w ?? null), [id])
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  if (workout === undefined) return null
  if (workout === null)
    return (
      <div className="page">
        <div className="topbar"><Link to="/historique" className="back" aria-label="Historique">‹</Link><h1>Séance introuvable</h1></div>
      </div>
    )

  const session = stored?.program.sessions.find((s) => s.id === workout.sessionId)

  async function redo() {
    if (!stored || !session || busy) return
    setBusy(true)
    const w = await startWorkout(stored.program, session)
    navigate(`/seance/${w.id}`)
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/historique" className="back" aria-label="Historique">‹</Link>
        <h1>{workout.sessionName}</h1>
      </div>
      <p className="muted">{formatDateTime(workout.startedAt)}, semaine {workout.weekLabel}</p>
      <SessionStats workout={workout} />
      {workout.shoulderPain != null && <p>Douleur épaule droite : <b>{workout.shoulderPain} sur 10</b></p>}
      {workout.note && <p>{workout.note}</p>}

      {workout.exercises.map((e, i) => {
        const sets = e.sets.filter((s) => s.done)
        if (sets.length === 0) return null
        let warm = 0, work = 0
        return (
          <section className="detail-ex" key={i}>
            <h3>{e.exercise.reference ? '★ ' : ''}{e.usedSubstitute ? (e.exercise.substitute ?? e.exercise.name) : e.exercise.name}</h3>
            {e.usedSubstitute && <div className="detail-note">Remplace : {e.exercise.name}</div>}
            {sets.map((s) => (
              <div className="detail-set" key={s.id}>
                <span className="n">{s.type === 'warmup' ? `E${++warm}` : ++work}</span>
                <span className="v">{show(s.weightKg)} × {show(s.reps)}</span>
                {s.rpe != null && <span className="r">RPE {show(s.rpe)}</span>}
              </div>
            ))}
            {e.note && <div className="detail-note">{e.note}</div>}
          </section>
        )
      })}

      <div className="stack">
        <Link to={`/seance/${workout.id}`} className="btn btn-lg btn-block">Modifier cette séance</Link>
        {session && <button className="btn btn-lg btn-block" disabled={busy} onClick={() => void redo()}>Refaire cette séance</button>}
      </div>
    </div>
  )
}
