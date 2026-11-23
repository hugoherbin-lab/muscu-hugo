import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { getSetting } from '../db'
import { prepareBackup, shareBackup, type PreparedBackup } from '../export'
import { formatRelativeDay } from '../program'

/**
 * Sauvegarde en un geste. Le fichier est préparé à l'avance : sur iPhone, la feuille de partage
 * doit s'ouvrir immédiatement après l'appui, sans attendre une lecture de la base.
 */
export default function BackupButton({ className = 'btn btn-lg btn-block' }: { className?: string }) {
  const lastBackupAt = useLiveQuery(() => getSetting<number>('lastBackupAt').then((v) => v ?? null))
  const prepared = useRef<PreparedBackup | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    prepareBackup().then((p) => { if (!cancelled) prepared.current = p }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  async function save() {
    setMsg(null)
    try {
      const how = await shareBackup(prepared.current ?? (await prepareBackup()))
      setMsg(how === 'share' ? 'Sauvegarde partagée. Enregistre-la dans Fichiers.' : 'Sauvegarde téléchargée.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg(`Sauvegarde impossible : ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <button className={className} onClick={() => void save()}>Sauvegarder mes données</button>
      <p className="muted small" style={{ marginTop: 6 }}>
        {msg ?? (lastBackupAt ? `Dernière sauvegarde : ${formatRelativeDay(lastBackupAt).replace(/\.$/, '')}.` : 'Aucune sauvegarde pour l’instant. Tes séances ne sont que sur ce téléphone.')}
      </p>
    </div>
  )
}
