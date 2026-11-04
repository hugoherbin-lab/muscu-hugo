import { useEffect, useState } from 'react'

interface Props {
  frames: string[]
  alt: string
}

/** Alterne les deux photos toutes les 900 ms ; un appui ouvre la démo en grand. */
export default function ExerciseMedia({ frames, alt }: Props) {
  const [i, setI] = useState(0)
  const [big, setBig] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % frames.length), 900)
    return () => window.clearInterval(id)
  }, [frames.length])

  return (
    <>
      <button className="ex-media" onClick={() => setBig(true)} aria-label={`Démo : ${alt}`}>
        {frames.map((src, k) => (
          <img key={src} src={src} alt={k === 0 ? alt : ''} loading="lazy" decoding="async" style={{ opacity: k === i ? 1 : 0 }} />
        ))}
        <span className="ex-media-dots">{frames.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</span>
      </button>
      {big && (
        <div className="sheet-backdrop media-backdrop" onClick={() => setBig(false)}>
          <div className="media-big">
            <div className="media-big-frame">
              {frames.map((src, k) => <img key={src} src={src} alt="" style={{ opacity: k === i ? 1 : 0 }} />)}
            </div>
            <div className="media-big-caption">{alt}</div>
            <button className="btn btn-lg btn-block" onClick={() => setBig(false)}>Fermer</button>
          </div>
        </div>
      )}
    </>
  )
}
