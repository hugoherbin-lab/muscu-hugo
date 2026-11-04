import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TimerProvider } from './timer'
import Home from './pages/Home'
import WorkoutPage from './pages/Workout'
import Rules from './pages/Rules'
import Data from './pages/Data'
import History from './pages/History'
import HistoryDetail from './pages/HistoryDetail'
import Saved from './pages/Saved'

export default function App() {
  return (
    <HashRouter>
      <TimerProvider>
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
