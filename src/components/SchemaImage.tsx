import { useState } from 'react'

interface Props {
  src: string
  alt: string
}

/** Schéma pleine largeur sous le titre. Un appui l'ouvre en plein écran, où il peut être tourné pour remplir l'écran. */
export default function SchemaImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false)
  const [turned, setTurned] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <>
      <button className="ex-schema" onClick={() => setOpen(true)} aria-label={`Agrandir le schéma : ${alt}`}>
        <img src={src} alt={`Schéma : ${alt}`} decoding="async" onError={() => setFailed(true)} />
      </button>
      {open && (
        <div className="schema-full" role="dialog" aria-label={`Schéma : ${alt}`}>
          <div className={`schema-full-frame ${turned ? 'turned' : ''}`} onClick={() => setOpen(false)}>
            <img src={src} alt={`Schéma : ${alt}`} />
          </div>
          <div className="schema-full-actions">
            <button className="btn btn-lg grow" onClick={() => setTurned((t) => !t)}>{turned ? 'Remettre droit' : 'Tourner'}</button>
            <button className="btn btn-lg btn-primary grow" onClick={() => setOpen(false)}>Fermer</button>
          </div>
        </div>
      )}
    </>
  )
}
