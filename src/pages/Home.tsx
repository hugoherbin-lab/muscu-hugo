import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImportProgram from '../components/ImportProgram'
import { db, getSetting } from '../db'
import { currentWeek, formatRIR, formatRelativeDay, formatWeekRange, nextSessionId, sessionById } from '../program'
import type { Session } from '../types'
import { startWorkout, workoutSetsDone } from '../workout'

export default function Home() {
  const navigate = useNavigate()
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  const inProgress = useLiveQuery(() => db.workouts.where('status').equals('in_progress').toArray())
  const doneList = useLiveQuery(() => db.workouts.where('status').equals('done').toArray())
  const lastBackupAt = useLiveQuery(() => getSetting<number>('lastBackupAt').then((v) => v ?? null))
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
  const current = [...inProgress].sort((a, b) => b.startedAt - a.startedAt)[0]
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

  if (!program) {
    return (
      <div className="page">
        <h1 style={{ marginBottom: 8 }}>Muscu Hugo</h1>
        <p className="muted">Aucun programme chargé. Choisis un fichier de programme pour commencer.</p>
        {msg && <div className="alert alert-ok">{msg}</div>}
        <div className="stack">
          <ImportProgram onDone={setMsg} />
          <Link to="/donnees" className="btn btn-block">Restaurer une sauvegarde</Link>
        </div>
      </div>
    )
  }

  const { week, position } = currentWeek(program)
  const weekIndex = program.weeks.findIndex((w) => w.label === week.label)
  const next = sessionById(program, nextSessionId(program, lastDone?.sessionId ?? null))
  const others = program.cycleOrder.map((id) => sessionById(program, id)).filter((s): s is Session => !!s && s.id !== next?.id)
  const daysSinceBackup = lastBackupAt ? Math.floor((Date.now() - lastBackupAt) / 86400000) : null
  const showBackupReminder = doneList.length > 0 && (daysSinceBackup === null || daysSinceBackup >= 7)

  return (
    <div className="page home">
      <div className="home-head">
        <span className="home-title">Muscu Hugo</span>
        <Link to="/donnees" className="btn btn-sm btn-ghost">Données</Link>
      </div>
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="week-hero">
        <div className="week-label">{week.label}</div>
        <div className="week-facts">
          <div className="week-rir">RIR {formatRIR(week.targetRIR)}</div>
          <div className="muted small">{formatWeekRange(week.start, week.end)}</div>
          {week.setsMultiplier !== 1 && <div className="small">Moitié des séries</div>}
        </div>
      </div>
      <div className="week-track" role="img" aria-label={`Semaine ${weekIndex + 1} sur ${program.weeks.length}`}>
        {program.weeks.map((w, i) => <span key={w.label} className={i < weekIndex ? 'past' : i === weekIndex ? 'now' : ''} />)}
      </div>
      {week.note && <p className="week-note">{week.note}</p>}
      {position === 'after' && <p className="muted">Programme terminé. Importe le suivant depuis Données.</p>}

      {confirmSession && current && (
        <div className="alert alert-warn">
          « {current.sessionName} » est déjà en cours. Commencer « {confirmSession.name} » quand même ? L’autre restera en cours.
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary grow" onClick={() => void begin(confirmSession)}>Commencer</button>
            <button className="btn grow" onClick={() => setConfirmSession(null)}>Annuler</button>
          </div>
        </div>
      )}

      <h2>{current ? 'Commencer une autre séance' : 'Ou choisis une autre séance'}</h2>
      <div className="session-list">
        {(current && next ? [next, ...others] : others).map((s) => (
          <button key={s.id} className="session-row" onClick={() => void begin(s)} disabled={starting}>
            <span>{s.name}</span>
            <small>{s.exercises.length} exercices</small>
          </button>
        ))}
      </div>

      <div className="home-links">
        <Link to="/regles" className="btn">Règles</Link>
        <Link to="/donnees" className="btn">Exporter</Link>
      </div>
      {showBackupReminder && (
        <p className="muted small center" style={{ marginTop: 16 }}>
          {daysSinceBackup === null ? 'Aucune sauvegarde pour l’instant.' : `Dernière sauvegarde il y a ${daysSinceBackup} jours.`}{' '}
          <Link to="/donnees">Sauvegarder</Link>
        </p>
      )}

      <div className="dock">
        <div className="dock-inner">
          {current ? (
            <Link to={`/seance/${current.id}`} className="btn btn-primary btn-xl dock-go">
              <span>Reprendre {current.sessionName}</span>
              <small>{workoutSetsDone(current)} séries faites</small>
            </Link>
          ) : next ? (
            <>
              {lastDone && <div className="dock-hint">Dernière séance : {lastDone.sessionName}, {formatRelativeDay(lastDone.startedAt)}.</div>}
              <button className="btn btn-primary btn-xl dock-go" disabled={starting} onClick={() => void begin(next)}>
                <span>Commencer {next.name}</span>
                <small>{next.exercises.length} exercices</small>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
