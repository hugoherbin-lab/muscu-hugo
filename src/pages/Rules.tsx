import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { formatRIR, formatShortDate } from '../program'

export default function Rules() {
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  if (stored === undefined) return null
  const program = stored?.program
  const rules = program?.rules ?? {}

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="back">‹ Accueil</Link>
        <h1>Règles</h1>
      </div>
      {!program && <p className="muted">Aucun programme chargé.</p>}
      {rules.progression && (
        <div className="card"><div className="card-title">Progression</div><p>{rules.progression}</p></div>
      )}
      {rules.tempo && (
        <div className="card"><div className="card-title">Tempo</div><p>{rules.tempo}</p></div>
      )}
      {Array.isArray(rules.shoulderPain) && rules.shoulderPain.length > 0 && (
        <div className="card">
          <div className="card-title">Douleur épaule droite (0 à 10)</div>
          {rules.shoulderPain.map((r) => (
            <div key={r.range} className="row" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span className="badge accent" style={{ minWidth: 48, textAlign: 'center' }}>{r.range}</span>
              <span>{r.action}</span>
            </div>
          ))}
        </div>
      )}
      {program && (
        <div className="card">
          <div className="card-title">Semaines</div>
          {program.weeks.map((w) => (
            <div key={w.label} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <b>{w.label}</b> <span className="muted small">{formatShortDate(w.start)} → {formatShortDate(w.end)}</span>
              {' · '}RIR {formatRIR(w.targetRIR)}{w.setsMultiplier !== 1 ? ` · séries × ${w.setsMultiplier}` : ''}
              {w.note && <div className="muted small">{w.note}</div>}
            </div>
          ))}
        </div>
      )}
      {program && program.dailyScore.length > 0 && (
        <div className="card">
          <div className="card-title">Score quotidien (7 critères)</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{program.dailyScore.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
