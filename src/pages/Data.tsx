import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ImportProgram from '../components/ImportProgram'
import { db, getSetting } from '../db'
import { exportBackupJson, exportJournalCsv, mergeBackup, readFileText, restoreBackup } from '../export'
import { formatDateTime } from '../program'

export default function Data() {
  const stored = useLiveQuery(() => db.programs.get('active').then((p) => p ?? null))
  const nDone = useLiveQuery(() => db.workouts.where('status').equals('done').count())
  const lastBackupAt = useLiveQuery(() => getSetting<number>('lastBackupAt'))
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<File | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  async function run(fn: () => Promise<'share' | 'download'>, what: string) {
    setMsg(null)
    try {
      const how = await fn()
      setMsg({ kind: 'ok', text: how === 'share' ? `${what} partagé.` : `${what} téléchargé.` })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }

  async function doRestore(file: File, mode: 'merge' | 'replace') {
    setConfirmRestore(null)
    setMsg(null)
    try {
      const text = await readFileText(file)
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        throw new Error('Le fichier n’est pas un JSON lisible.')
      }
      if (mode === 'merge') {
        const r = await mergeBackup(raw)
        setMsg({ kind: 'ok', text: `${r.added} séance(s) ajoutée(s) au journal${r.already ? `, ${r.already} déjà présente(s)` : ''}.` })
      } else {
        const r = await restoreBackup(raw)
        setMsg({ kind: 'ok', text: `Sauvegarde restaurée : ${r.workouts} séance(s)${r.hasProgram ? ' et le programme' : ''}.` })
      }
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    } finally {
      if (restoreRef.current) restoreRef.current.value = ''
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="back">‹ Accueil</Link>
        <h1>Données</h1>
      </div>
      {msg && <div className={`alert ${msg.kind === 'ok' ? 'alert-ok' : 'alert-error'}`}>{msg.text}</div>}

      <div className="card">
        <div className="card-title">Programme</div>
        {stored ? (
          <p className="muted small">{stored.program.programName}, version {stored.program.version}, chargé le {formatDateTime(stored.importedAt)}.</p>
        ) : (
          <p className="muted small">Aucun programme chargé.</p>
        )}
        <ImportProgram className="btn btn-primary btn-lg btn-block" onDone={(t) => setMsg({ kind: 'ok', text: t })} />
        <p className="muted small" style={{ marginTop: 8 }}>Un nouvel import remplace le programme actif. Le journal n’est pas touché.</p>
      </div>

      <div className="card">
        <div className="card-title">Export pour le coach</div>
        <p className="muted small">{nDone ?? 0} séance(s) terminée(s). Une ligne par série, format CSV (UTF-8, virgule).</p>
        <button className="btn btn-lg btn-block" onClick={() => void run(exportJournalCsv, 'Journal CSV')}>Exporter le journal (CSV)</button>
      </div>

      <div className="card">
        <div className="card-title">Sauvegarde complète</div>
        <p className="muted small">
          Programme + journal dans un seul fichier JSON.{' '}
          {lastBackupAt ? `Dernière sauvegarde : ${formatDateTime(lastBackupAt)}.` : 'Aucune sauvegarde pour l’instant.'}
        </p>
        <div className="stack">
          <button className="btn btn-primary btn-lg btn-block" onClick={() => void run(exportBackupJson, 'Sauvegarde JSON')}>Sauvegarder (JSON)</button>
          <input ref={restoreRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setConfirmRestore(f) }} />
          <button className="btn btn-lg btn-block" onClick={() => restoreRef.current?.click()}>Restaurer une sauvegarde</button>
        </div>
        {confirmRestore && (
          <div className="alert alert-warn" style={{ marginTop: 10 }}>
            Que faire de « {confirmRestore.name} » ?
            <div className="stack" style={{ marginTop: 10 }}>
              <button className="btn btn-primary btn-block" onClick={() => void doRestore(confirmRestore, 'merge')}>Ajouter à mon journal</button>
              <div className="small">Ajoute les séances manquantes. Rien n’est effacé.</div>
              <button className="btn btn-danger btn-block" onClick={() => void doRestore(confirmRestore, 'replace')}>Tout remplacer</button>
              <div className="small">Efface le programme et le journal actuels, puis remet ceux de la sauvegarde.</div>
              <button className="btn btn-block" onClick={() => setConfirmRestore(null)}>Annuler</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Stockage</div>
        <p className="muted small">
          Tout reste sur ce téléphone, rien n’est envoyé sur internet.{' '}
          {persisted === true && 'Stockage persistant : oui.'}
          {persisted === false && 'Stockage persistant : non accordé par le navigateur (fais une sauvegarde régulière).'}
          {persisted === null && 'Stockage persistant : non indiqué par ce navigateur.'}
        </p>
        <p className="muted small">Version {__APP_VERSION__}</p>
      </div>
    </div>
  )
}
