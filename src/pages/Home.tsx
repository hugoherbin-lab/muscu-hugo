import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImportProgram from '../components/ImportProgram'
import { db, getSetting } from '../db'
import { currentWeek, formatDayMonth, formatRIR, formatRelativeDay, formatWeekRange } from '../program'
import { weekProgress } from '../progress'
import type { Session } from '../types'
import { startWorkout, workoutSetsDone } from '../workout'

const setsLabel = (n: number) => (n > 1 ? `${n} séries faites` : `${n} série faite`)

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
  const progress = weekProgress(program, week, doneList, inProgress)
  const next = progress.next
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

      <h2 className="week-count">{week.label} : {progress.doneCount}/{progress.plannedCount} séances faites</h2>
      <div className="cycle">
        {progress.rows.map((r) => {
          const isNext = !current && next?.id === r.session.id && !r.doneWorkout
          if (r.inProgress) {
            return (
              <Link key={r.session.id} to={`/seance/${r.inProgress.id}`} className="cycle-row running">
                <span className="cycle-mark" />
                <span className="cycle-text">{r.session.name}<small>En cours, {setsLabel(workoutSetsDone(r.inProgress))}</small></span>
                <span className="cycle-resume">Reprendre</span>
              </Link>
            )
          }
          if (r.doneWorkout) {
            return (
              <Link key={r.session.id} to={`/historique/${r.doneWorkout.id}`} className="cycle-row done">
                <span className="cycle-mark">✓</span>
                <span className="cycle-text">{r.session.name}<small>Faite le {formatDayMonth(r.doneWorkout.startedAt)}</small></span>
              </Link>
            )
          }
          return (
            <button key={r.session.id} className={`cycle-row ${isNext ? 'next' : ''} ${r.excluded ? 'skipped' : ''}`} disabled={starting} onClick={() => void begin(r.session)}>
              <span className="cycle-mark" />
              <span className="cycle-text">{r.session.name}<small>{isNext ? 'Prochaine séance' : r.excluded ? 'Pas prévue cette semaine' : `${r.session.exercises.length} exercices`}</small></span>
            </button>
          )
        })}
      </div>

      <div className="home-links">
        <Link to="/historique" className="btn">Historique</Link>
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
              <small>En cours, {setsLabel(workoutSetsDone(current))}</small>
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
