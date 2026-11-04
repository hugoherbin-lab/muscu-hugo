import { useState } from 'react'
import { parseNum } from './Stepper'

interface Props {
  defaultDurationMin: number
  doneSets: number
  totalSets: number
  onConfirm: (data: { shoulderPain: number | null; note: string; durationMin: number }) => void
  onClose: () => void
}

export default function FinishSheet({ defaultDurationMin, doneSets, totalSets, onConfirm, onClose }: Props) {
  const [pain, setPain] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [duration, setDuration] = useState<number | null>(defaultDurationMin)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Terminer la séance</h2>
        <p className={doneSets === 0 ? 'finish-warn' : 'muted'}>
          {doneSets === 0
            ? 'Aucune série cochée. Coche au moins une série, ou supprime la séance depuis Plan.'
            : doneSets < totalSets
              ? `${doneSets} ${doneSets > 1 ? 'séries de travail cochées' : 'série de travail cochée'} sur ${totalSets}. Les autres ne seront pas enregistrées.`
              : `Les ${totalSets} séries de travail sont cochées.`}
        </p>
        <label className="field">Douleur épaule droite (0 = rien, 10 = insupportable)</label>
        <div className="pain-grid" style={{ marginBottom: 14 }}>
          {Array.from({ length: 11 }, (_, i) => i).map((v) => (
            <button
              key={v}
              className={`btn ${pain === v ? 'selected' : ''} ${v >= 6 ? 'p-danger' : v >= 4 ? 'p-warn' : ''}`}
              onClick={() => setPain(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {pain != null && pain >= 4 && (
          <p className="small" style={{ color: pain >= 6 ? 'var(--danger)' : 'var(--warn)' }}>
            {pain >= 6 ? 'Règle : arrêter l’exercice concerné, fourmillements = consulter.' : 'Règle : réduire amplitude ou charge ; si ça persiste, remplaçant.'}
          </p>
        )}
        <label className="field">Note de séance (facultatif)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Forme, sommeil, réglages de machines…" />
        <label className="field" style={{ marginTop: 10 }}>Durée totale (minutes)</label>
        <input type="text" inputMode="numeric" defaultValue={defaultDurationMin} onChange={(e) => setDuration(parseNum(e.target.value))} />
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn grow" onClick={onClose}>Retour</button>
          <button
            className="btn btn-ok grow btn-lg"
            disabled={doneSets === 0}
            onClick={() => onConfirm({ shoulderPain: pain, note, durationMin: Math.max(0, Math.round(duration ?? defaultDurationMin)) })}
          >
            Enregistrer la séance
          </button>
        </div>
      </div>
    </div>
  )
}
