import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import RulesContent from '../components/RulesContent'
import { db } from '../db'
import { formatRIR, formatWeekRange } from '../program'

export default function Rules() {
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  if (stored === undefined) return null
  const program = stored?.program

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="back" aria-label="Accueil">‹</Link>
        <h1>Règles</h1>
      </div>
      {!program && <p className="muted">Aucun programme chargé.</p>}
      {program && <RulesContent rules={program.rules} />}
      {program && (
        <section className="rule">
          <h3>Semaines</h3>
          {program.weeks.map((w) => (
            <div key={w.label} className="week-line">
              <b>{w.label}</b> <span className="muted small">{formatWeekRange(w.start, w.end)}</span>
              <div>RIR {formatRIR(w.targetRIR)}{w.setsMultiplier !== 1 ? ', moitié des séries' : ''}</div>
              {w.note && <div className="muted small">{w.note}</div>}
            </div>
          ))}
        </section>
      )}
      {program && program.dailyScore.length > 0 && (
        <section className="rule">
          <h3>Score quotidien</h3>
          <ul>{program.dailyScore.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
