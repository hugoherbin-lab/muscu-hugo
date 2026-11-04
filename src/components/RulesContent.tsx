import { ruleSections } from '../generic'

/** Affiche tout le contenu de rules, y compris les règles ajoutées plus tard au fichier. */
export default function RulesContent({ rules }: { rules: unknown }) {
  const sections = ruleSections(rules)
  if (sections.length === 0) return <p className="muted">Ce programme ne contient aucune règle.</p>
  return (
    <>
      {sections.map((s) => (
        <section className="rule" key={s.key}>
          <h3>{s.label}</h3>
          {s.lines.length === 1 ? <p>{s.lines[0]}</p> : <ul>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </section>
      ))}
    </>
  )
}
