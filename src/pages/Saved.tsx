import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import SessionStats from '../components/SessionStats'
import { db } from '../db'
import { formatDateTime } from '../program'

export default function Saved() {
  const { id } = useParams()
  const workout = useLiveQuery(() => db.workouts.get(id ?? '').then((w) => w ?? null), [id])
  if (!workout || workout.status !== 'done') return null

  return (
    <div className="page">
      <div className="saved-hero">
        <h1>Séance enregistrée ✓</h1>
        <div>{workout.sessionName}</div>
        <div className="small">{formatDateTime(workout.startedAt)}</div>
      </div>
      <SessionStats workout={workout} />
      <p className="muted small">Le total compte les séries de travail cochées (charge × reps), sans l’échauffement.</p>
      <div className="stack" style={{ marginTop: 16 }}>
        <Link to="/" className="btn btn-primary btn-xl">Retour à l’accueil</Link>
        <Link to={`/historique/${workout.id}`} className="btn btn-lg btn-block">Voir le détail</Link>
      </div>
    </div>
  )
}
