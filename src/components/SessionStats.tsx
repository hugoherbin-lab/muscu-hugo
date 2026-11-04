import type { Workout } from '../types'
import { workoutStats } from '../workout'

/** Durée, séries et total soulevé d'une séance. */
export default function SessionStats({ workout }: { workout: Workout }) {
  const s = workoutStats(workout)
  return (
    <div className="stats">
      <div className="stat"><b>{s.durationMin}</b><span>minutes</span></div>
      <div className="stat"><b>{s.workSets}</b><span>{s.workSets > 1 ? 'séries' : 'série'}</span></div>
      <div className="stat"><b>{s.volumeKg.toLocaleString('fr-FR')}</b><span>kg soulevés</span></div>
    </div>
  )
}
