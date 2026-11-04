import { useEffect, useRef, useState } from 'react'
import { formatRIR } from '../program'
import { unlockAudio, useTimer } from '../timer'
import type { ExerciseLog, SetLog } from '../types'
import { WARMUP_REST_SEC, formatPerf, newEmptySet, roundKg, type LastPerformance } from '../workout'
import { exerciseFrames } from '../media'
import ExerciseMedia from './ExerciseMedia'
import RpeSheet from './RpeSheet'
import SetRow from './SetRow'

interface Props {
  log: ExerciseLog
  targetRIR: number
  last: LastPerformance | null
  suggestion: number | null
  onChange: (next: ExerciseLog) => void
  onToggleSubstitute: () => void
}

function fmtRest(sec: number) {
  if (sec <= 0) return 'enchaîner'
  const m = Math.floor(sec / 60), s = sec % 60
  return s ? `${m} min ${s}` : `${m} min`
}

export default function ExerciseCard({ log, targetRIR, last, suggestion, onChange, onToggleSubstitute }: Props) {
  const timer = useTimer()
  const [rpeFor, setRpeFor] = useState<string | null>(null)
  const [fillVersion, setFillVersion] = useState(0)
  const firstRender = useRef(true)
  // Quand on bascule original ↔ remplaçant, les valeurs sont ré-injectées : on remonte les champs.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setFillVersion((v) => v + 1)
  }, [log.usedSubstitute])
  const ex = log.exercise
  const workSets = log.sets.filter((s) => s.type === 'work')
  const doneWork = workSets.filter((s) => s.done).length
  const name = log.usedSubstitute ? (ex.substitute ?? ex.name) : ex.name
  const frames = log.usedSubstitute ? null : exerciseFrames(ex.id)

  function patchSet(id: string, patch: Partial<SetLog>) {
    onChange({ ...log, sets: log.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  }

  function toggleDone(set: SetLog) {
    unlockAudio()
    const done = !set.done
    patchSet(set.id, { done, doneAt: done ? Date.now() : null })
    if (!done) return
    const rest = set.type === 'warmup' ? (ex.restSec > 0 ? Math.min(WARMUP_REST_SEC, ex.restSec) : 0) : ex.restSec
    const idx = set.type === 'warmup' ? log.sets.filter((s) => s.type === 'warmup').indexOf(set) + 1 : workSets.indexOf(set) + 1
    const total = set.type === 'warmup' ? ex.warmup.length : workSets.length
    const isLast = set.type === 'work' && idx >= total
    if (rest > 0) timer.start(rest, `${name} · ${set.type === 'warmup' ? 'montée' : 'série'} ${idx}/${total}${isLast ? ' (dernière)' : ''}`)
  }

  function applySuggestion() {
    if (suggestion == null) return
    onChange({
      ...log,
      sets: log.sets.map((s) => (s.type === 'work' && !s.done ? { ...s, weightKg: suggestion, reps: ex.repMin } : s)),
    })
    setFillVersion((v) => v + 1)
  }

  function addSet() {
    const prev = workSets[workSets.length - 1]
    onChange({ ...log, sets: [...log.sets, newEmptySet(prev)] })
  }

  function removeLastSet() {
    if (workSets.length <= 1) return
    const target = [...workSets].reverse().find((s) => !s.done) ?? workSets[workSets.length - 1]
    onChange({ ...log, sets: log.sets.filter((s) => s.id !== target.id) })
  }

  let warmN = 0, workN = 0
  const rpeSet = rpeFor ? log.sets.find((s) => s.id === rpeFor) : undefined

  return (
    <div className={`card ${doneWork === workSets.length && workSets.length > 0 ? '' : ''}`}>
      <div className="ex-head">
        <div className="grow">
          <div className="ex-name">
            {ex.reference && <span className="star">★ </span>}
            {name}
          </div>
          {log.usedSubstitute && <div className="small" style={{ color: 'var(--warn)' }}>Remplaçant de : {ex.name}</div>}
          <div className="ex-meta">
            <span className="badge">{ex.muscle}</span>
            <span>{workSets.length} × {ex.repMin}–{ex.repMax}{ex.perSide ? ' / bras' : ''}</span>
            <span>RIR {formatRIR(targetRIR)}</span>
            <span>Repos {fmtRest(ex.restSec)}</span>
          </div>
        </div>
        <div className="ex-done-count">{doneWork}/{workSets.length}</div>
      </div>

      {frames && <ExerciseMedia frames={frames} alt={ex.name} />}

      {last ? (
        <div className="ex-last">Dernière fois ({last.weekLabel}) : <b>{formatPerf(last.sets, ex.perSide)}</b></div>
      ) : (
        <div className="ex-last">
          Première fois.{' '}
          {ex.startWeightKg != null ? <>Départ : <b>{ex.startWeightKg} kg</b>.</> : null}
          {ex.startNote ? <> {ex.startNote}</> : null}
        </div>
      )}

      {suggestion != null && !log.usedSubstitute && (
        <div className="ex-suggest">
          <span>Monte à {roundKg(suggestion)} kg</span>
          <button className="btn btn-sm btn-ok" onClick={applySuggestion}>Appliquer</button>
        </div>
      )}

      <div className="ex-tools">
        {ex.tips.length > 0 && (
          <details className="grow" style={{ flexBasis: '100%' }}>
            <summary>Conseils ▾</summary>
            <div className="tips"><ul>{ex.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
          </details>
        )}
        {ex.mediaUrl && <a className="btn btn-sm" href={ex.mediaUrl} target="_blank" rel="noreferrer">Vidéo ↗</a>}
        {ex.substitute && (
          <button className="btn btn-sm" onClick={onToggleSubstitute}>
            {log.usedSubstitute ? 'Revenir à l’original' : `Utiliser le remplaçant`}
          </button>
        )}
      </div>
      {ex.substitute && !log.usedSubstitute && <div className="muted small" style={{ marginTop: -4, marginBottom: 6 }}>Remplaçant : {ex.substitute}</div>}

      <div className="sets">
        <div className="sets-header"><span></span><span>kg</span><span>reps</span><span>RPE</span><span>fait</span></div>
        {log.sets.map((s) => {
          const label = s.type === 'warmup' ? `E${++warmN}` : String(++workN)
          return (
            <SetRow
              key={s.id}
              set={s}
              label={label}
              fillVersion={fillVersion}
              onChange={(p) => patchSet(s.id, p)}
              onToggleDone={() => toggleDone(s)}
              onOpenRpe={() => setRpeFor(s.id)}
            />
          )
        })}
      </div>
      {ex.warmup.length > 0 && <div className="muted small" style={{ marginTop: 4 }}>E = échauffement (montée). 0 kg = barre seule / poids du corps.</div>}

      <div className="set-actions">
        <button className="btn btn-sm grow" onClick={addSet}>+ Série</button>
        <button className="btn btn-sm grow" onClick={removeLastSet} disabled={workSets.length <= 1}>− Série</button>
      </div>

      <details style={{ marginTop: 6 }}>
        <summary>{log.note ? `Note : ${log.note.slice(0, 40)}${log.note.length > 40 ? '…' : ''}` : 'Note sur l’exercice ▾'}</summary>
        <textarea defaultValue={log.note} placeholder="Réglage du siège, sensation, douleur…" onChange={(e) => onChange({ ...log, note: e.target.value })} />
      </details>

      {rpeSet && <RpeSheet value={rpeSet.rpe} onSelect={(v) => patchSet(rpeSet.id, { rpe: v })} onClose={() => setRpeFor(null)} />}
    </div>
  )
}
