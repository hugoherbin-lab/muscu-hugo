import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { formatDayMonth } from '../program'
import { workoutStats } from '../workout'

export default function History() {
  const done = useLiveQuery(() => db.workouts.where('status').equals('done').toArray())
  if (done === undefined) return null
  const list = [...done].sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="back" aria-label="Accueil">‹</Link>
        <h1>Historique</h1>
      </div>
      {list.length === 0 && <p className="muted">Aucune séance terminée pour l’instant. Termine une séance pour la retrouver ici.</p>}
      {list.map((w) => {
        const s = workoutStats(w)
        return (
          <Link key={w.id} to={`/historique/${w.id}`} className="history-row">
            <b>{w.sessionName}</b>
            <span>{formatDayMonth(w.startedAt)}, {s.durationMin} min, {s.workSets} {s.workSets > 1 ? 'séries' : 'série'}</span>
          </Link>
        )
      })}
    </div>
  )
}
