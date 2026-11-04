import { useRef, useState } from 'react'
import { db } from '../db'
import { readFileText } from '../export'
import { ProgramError, validateProgram } from '../program'

interface Props {
  label?: string
  className?: string
  onDone?: (summary: string) => void
}

/** Bouton « Importer un programme » : choisit un JSON, le valide, remplace le programme actif (journal intact). */
export default function ImportProgram({ label = 'Importer un programme', className = 'btn btn-primary btn-lg btn-block', onDone }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const text = await readFileText(file)
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        throw new ProgramError('Le fichier n’est pas un JSON lisible (virgule ou accolade manquante ?).')
      }
      const program = validateProgram(raw)
      await db.programs.put({ id: 'active', program, importedAt: Date.now() })
      const nEx = program.sessions.reduce((n, s) => n + s.exercises.length, 0)
      onDone?.(`Programme « ${program.programName} » importé : ${program.sessions.length} séances, ${nEx} exercices.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <button className={className} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Lecture…' : label}
      </button>
      {error && <div className="alert alert-error" style={{ marginTop: 10 }}>Fichier refusé : {error}</div>}
    </div>
  )
}
