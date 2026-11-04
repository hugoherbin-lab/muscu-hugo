import { useEffect, useRef, useState } from 'react'

export function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const show = (v: number | null) => (v == null ? '' : String(v).replace('.', ','))

interface Props {
  field: 'kg' | 'reps'
  unit: string
  value: number | null
  step: number
  inputMode: 'decimal' | 'numeric'
  placeholder?: string
  /** Valeur proposée au premier appui sur − ou + quand le champ est vide. */
  base?: number
  onChange: (v: number | null) => void
}

/** Valeur en grand, disques − et + pour le pouce. Un appui sur le chiffre ouvre le clavier numérique. */
export default function Stepper({ field, unit, value, step, inputMode, placeholder, base, onChange }: Props) {
  const [draft, setDraft] = useState(show(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(show(value))
  }, [value])

  const bump = (delta: number) => {
    if (value == null && base != null) {
      onChange(base)
      return
    }
    const next = Math.max(0, Math.round(((value ?? 0) + delta) * 100) / 100)
    onChange(next)
  }

  return (
    <div className="stepper">
      <button className="disc" onClick={() => bump(-step)} aria-label={`Retirer ${show(step)} ${unit}`}>−</button>
      <div className="stepper-value">
        <input
          type="text"
          inputMode={inputMode}
          value={draft}
          placeholder={placeholder ?? '–'}
          aria-label={unit}
          data-field={field}
          onFocus={(e) => { focused.current = true; e.target.select() }}
          onBlur={() => { focused.current = false; setDraft(show(value)) }}
          onChange={(e) => { setDraft(e.target.value); onChange(parseNum(e.target.value)) }}
        />
        <span>{unit}</span>
      </div>
      <button className="disc" onClick={() => bump(step)} aria-label={`Ajouter ${show(step)} ${unit}`}>+</button>
    </div>
  )
}
