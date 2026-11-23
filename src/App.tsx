import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TimerProvider } from './timer'
import { applyPendingUpdate } from './update'
import Home from './pages/Home'
import WorkoutPage from './pages/Workout'
import Rules from './pages/Rules'
import Data from './pages/Data'
import History from './pages/History'
import HistoryDetail from './pages/HistoryDetail'
import Saved from './pages/Saved'

/** À chaque changement d'écran, applique une mise à jour en attente si on n'est pas en séance. */
function UpdateOnNavigation() {
  const location = useLocation()
  useEffect(() => {
    applyPendingUpdate()
  }, [location])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <TimerProvider>
        <UpdateOnNavigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/seance/:id" element={<WorkoutPage />} />
          <Route path="/seance/:id/enregistree" element={<Saved />} />
          <Route path="/historique" element={<History />} />
          <Route path="/historique/:id" element={<HistoryDetail />} />
          <Route path="/regles" element={<Rules />} />
          <Route path="/donnees" element={<Data />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TimerProvider>
    </HashRouter>
  )
}
