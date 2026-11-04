const VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

interface Props {
  value: number | null
  onSelect: (v: number | null) => void
  onClose: () => void
}

/** Sélecteur RPE 6 → 10 par pas de 0,5, gros boutons. */
export default function RpeSheet({ value, onSelect, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>RPE de la série</h2>
        <p className="muted small">RPE 10 = échec · 9 = 1 rep en réserve · 8 = 2 en réserve · 7 = 3 en réserve</p>
        <div className="rpe-grid">
          {VALUES.map((v) => (
            <button key={v} className={`btn ${value === v ? 'selected' : ''}`} onClick={() => { onSelect(v); onClose() }}>
              {String(v).replace('.', ',')}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn grow" onClick={() => { onSelect(null); onClose() }}>Effacer</button>
          <button className="btn grow" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
