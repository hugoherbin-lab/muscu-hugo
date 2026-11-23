import BackupButton from './BackupButton'

export const NEW_ADDRESS = 'https://muscu-hugo.vercel.app/'

export function isOldAddress(hostname: string = location.hostname): boolean {
  return hostname.endsWith('github.io')
}

/** Affiché uniquement sur l'ancienne adresse : explique comment emmener ses séances vers la nouvelle. */
export default function OldAddressNotice({ sessions }: { sessions: number }) {
  if (!isOldAddress()) return null
  return (
    <div className="alert alert-warn">
      <b>Tu es sur l’ancienne adresse.</b> La nouvelle est muscu-hugo.vercel.app, et les deux ne partagent pas leurs données.
      {sessions > 0 ? (
        <>
          <p style={{ margin: '8px 0' }}>
            Il y a {sessions} {sessions > 1 ? 'séances' : 'séance'} ici. Pour {sessions > 1 ? 'les' : 'la'} emmener : sauvegarde ici, ouvre la nouvelle adresse, puis Données, Restaurer une sauvegarde, « Ajouter à mon journal ».
          </p>
          <BackupButton className="btn btn-primary btn-block" />
        </>
      ) : (
        <p style={{ margin: '8px 0' }}>Aucune séance n’est enregistrée ici : utilise simplement la nouvelle adresse.</p>
      )}
      <a className="btn btn-block" href={NEW_ADDRESS}>Ouvrir la nouvelle adresse</a>
    </div>
  )
}
