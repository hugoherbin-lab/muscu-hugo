import type { SetLog } from '../types'

export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

interface Props {
  set: SetLog
  label: string
  /** change quand des valeurs sont injectées par le code (suggestion appliquée, remplaçant) → remonte les inputs */
  fillVersion: number
  onChange: (patch: Partial<SetLog>) => void
  onToggleDone: () => void
  onOpenRpe: () => void
}

export default function SetRow({ set, label, fillVersion, onChange, onToggleDone, onOpenRpe }: Props) {
  const k = `${set.id}-${fillVersion}`
  return (
    <div className={`set-row ${set.type} ${set.done ? 'done' : ''}`}>
      <div className="num">{label}</div>
      <input
        key={`w-${k}`}
        type="text"
        inputMode="decimal"
        placeholder={set.type === 'warmup' && set.weightKg === 0 ? '0' : 'kg'}
        defaultValue={set.weightKg ?? ''}
        onChange={(e) => onChange({ weightKg: parseNum(e.target.value) })}
        aria-label="Charge en kg"
      />
      <input
        key={`r-${k}`}
        type="text"
        inputMode="numeric"
        placeholder="reps"
        defaultValue={set.reps ?? ''}
        onChange={(e) => onChange({ reps: parseNum(e.target.value) })}
        aria-label="Répétitions"
      />
      <button className={`rpe ${set.rpe == null ? 'empty' : ''}`} onClick={onOpenRpe} aria-label="RPE">
        {set.rpe == null ? 'RPE' : String(set.rpe).replace('.', ',')}
      </button>
      <button className="check" onClick={onToggleDone} aria-label={set.done ? 'Série faite' : 'Marquer faite'}>
        {set.done ? '✓' : '○'}
      </button>
    </div>
  )
}
