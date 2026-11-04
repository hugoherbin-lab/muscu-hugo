import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImportProgram from '../components/ImportProgram'
import { db, getSetting } from '../db'
import { currentWeek, formatRIR, formatRelativeDay, formatShortDate, nextSessionId, sessionById } from '../program'
import type { Session } from '../types'
import { startWorkout, workoutSetsDone } from '../workout'

export default function Home() {
  const navigate = useNavigate()
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  const inProgress = useLiveQuery(() => db.workouts.where('status').equals('in_progress').toArray())
  const doneList = useLiveQuery(() => db.workouts.where('status').equals('done').toArray())
  const lastBackupAt = useLiveQuery(() => getSetting<number>('lastBackupAt'))
  const [msg, setMsg] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [confirmSession, setConfirmSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 6000)
    return () => clearTimeout(id)
  }, [msg])

  if (stored === undefined || inProgress === undefined || doneList === undefined) return null

  const program = stored?.program
  const current = inProgress.sort((a, b) => b.startedAt - a.startedAt)[0]
  const lastDone = [...doneList].sort((a, b) => b.startedAt - a.startedAt)[0]

  async function begin(session: Session) {
    if (!program || starting) return
    if (current && confirmSession?.id !== session.id) {
      setConfirmSession(session)
      return
    }
    setStarting(true)
    try {
      const w = await startWorkout(program, session)
      navigate(`/seance/${w.id}`)
    } finally {
      setStarting(false)
    }
  }

  const daysSinceBackup = lastBackupAt ? Math.floor((Date.now() - lastBackupAt) / 86400000) : null
  const showBackupReminder = doneList.length > 0 && (daysSinceBackup === null || daysSinceBackup >= 7)

  if (!program) {
    return (
      <div className="page">
        <h1>Muscu Hugo</h1>
        <p className="muted">Aucun programme chargé. Importe ton fichier <code>programme-seche.json</code> pour commencer.</p>
        {msg && <div className="alert alert-ok">{msg}</div>}
        <div className="stack">
          <ImportProgram onDone={setMsg} />
          <Link to="/donnees" className="btn btn-block">Restaurer une sauvegarde</Link>
        </div>
      </div>
    )
  }

  const { week, position } = currentWeek(program)
  const nextId = nextSessionId(program, lastDone?.sessionId ?? null)
  const next = sessionById(program, nextId)
  const others = program.cycleOrder.map((id) => sessionById(program, id)).filter((s): s is Session => !!s && s.id !== nextId)

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 className="grow">Muscu Hugo</h1>
        <Link to="/donnees" className="btn btn-sm">Données</Link>
      </div>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="card">
        <div className="hero-week">
          <span className="label">{week.label}</span>
          <span className="muted">{formatShortDate(week.start)} → {formatShortDate(week.end)}</span>
        </div>
        <div className="row wrap" style={{ marginTop: 6 }}>
          <span className="badge accent">RIR cible : {formatRIR(week.targetRIR)}</span>
          {week.setsMultiplier !== 1 && <span className="badge warn">Séries × {week.setsMultiplier}</span>}
        </div>
        {week.note && <p style={{ marginTop: 8 }}>{week.note}</p>}
        {position === 'before' && <p className="muted small">Le programme commence le {formatShortDate(program.weeks[0].start)}.</p>}
        {position === 'after' && <p className="muted small">Programme terminé : importe le prochain quand il est prêt.</p>}
      </div>

      {current && (
        <div className="card accent">
          <div className="card-title">Séance en cours : {current.sessionName}</div>
          <p className="muted small">Commencée {formatRelativeDay(current.startedAt)} · {workoutSetsDone(current)} série(s) faite(s)</p>
          <Link to={`/seance/${current.id}`} className="btn btn-primary btn-lg btn-block">Reprendre la séance</Link>
        </div>
      )}

      {confirmSession && current && (
        <div className="alert alert-warn">
          Une séance « {current.sessionName} » est déjà en cours. Commencer « {confirmSession.name} » quand même ? L’autre restera en cours.
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary grow" onClick={() => void begin(confirmSession)}>Oui, commencer</button>
            <button className="btn grow" onClick={() => setConfirmSession(null)}>Non</button>
          </div>
        </div>
      )}

      {next && (
        <div className="card start-card">
          <div className="muted small" style={{ marginBottom: 8 }}>
            Prochaine séance suggérée{lastDone ? ` · dernière : ${lastDone.sessionName}, ${formatRelativeDay(lastDone.startedAt)}` : ''}
          </div>
          <button className="btn btn-primary btn-xl" disabled={starting} onClick={() => void begin(next)}>
            <span>Commencer : {next.name}</span>
            <small>{next.exercises.length} exercices</small>
          </button>
        </div>
      )}

      <h2 style={{ marginTop: 18 }}>Autre séance</h2>
      <div className="list">
        {others.map((s) => (
          <button key={s.id} className="list-item" onClick={() => void begin(s)} disabled={starting}>
            <span className="grow" style={{ textAlign: 'left' }}>{s.name}<br /><span className="muted small">{s.exercises.length} exercices</span></span>
            <span className="chev">›</span>
          </button>
        ))}
      </div>

      <div className="nav-grid" style={{ marginTop: 18 }}>
        <Link to="/regles" className="btn">Règles</Link>
        <Link to="/donnees" className="btn">Export & sauvegarde</Link>
      </div>

      {showBackupReminder && (
        <p className="muted small center" style={{ marginTop: 16 }}>
          {daysSinceBackup === null ? 'Aucune sauvegarde encore faite.' : `Dernière sauvegarde il y a ${daysSinceBackup} jours.`}{' '}
          <Link to="/donnees">Sauvegarder</Link>
        </p>
      )}
      <p className="muted small center" style={{ marginTop: 12 }}>{program.programName}{program.gym ? ` · ${program.gym}` : ''}</p>
    </div>
  )
}
