import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getSetting, setSetting } from './db'
import type { TimerState } from './types'

interface TimerApi {
  state: TimerState | null
  remaining: number
  finished: boolean
  minimized: boolean
  start: (sec: number, label: string) => void
  adjust: (deltaSec: number) => void
  skip: () => void
  dismiss: () => void
  setMinimized: (v: boolean) => void
}

const TimerContext = createContext<TimerApi | null>(null)

let audioCtx: AudioContext | null = null
/** À appeler dans un geste utilisateur : iOS n'autorise le son qu'après une interaction. */
export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    /* pas de son */
  }
}

function beep() {
  if (!audioCtx) return
  try {
    const t0 = audioCtx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'square'
      osc.frequency.value = i === 2 ? 1320 : 880
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + i * 0.25 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.25 + 0.2)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t0 + i * 0.25)
      osc.stop(t0 + i * 0.25 + 0.22)
    }
  } catch {
    /* ignore */
  }
}

function vibrate() {
  try {
    navigator.vibrate?.([300, 100, 300, 100, 600])
  } catch {
    /* ignore */
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [finished, setFinished] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const alarmedFor = useRef<number | null>(null)

  // Restauration après rechargement de l'app
  useEffect(() => {
    getSetting<TimerState>('timer').then((t) => {
      if (t && t.endAt > Date.now()) setState(t)
      setLoaded(true)
    })
  }, [])

  // Tick basé sur Date.now() : reste juste même si l'app passe en arrière-plan
  useEffect(() => {
    if (!state) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    const onVis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [state])

  const remaining = state ? Math.max(0, Math.ceil((state.endAt - now) / 1000)) : 0

  useEffect(() => {
    if (!state) return
    if (remaining <= 0 && alarmedFor.current !== state.endAt) {
      alarmedFor.current = state.endAt
      setFinished(true)
      setMinimized(false)
      beep()
      vibrate()
      void setSetting('timer', null)
      const id = window.setTimeout(() => {
        setFinished(false)
        setState(null)
      }, 8000)
      return () => window.clearTimeout(id)
    }
  }, [remaining, state])

  const start = useCallback((sec: number, label: string) => {
    if (sec <= 0) return
    const s: TimerState = { endAt: Date.now() + sec * 1000, totalSec: sec, label }
    setFinished(false)
    setMinimized(false)
    setNow(Date.now())
    setState(s)
    void setSetting('timer', s)
  }, [])

  const adjust = useCallback((delta: number) => {
    setState((s) => {
      if (!s) return s
      const endAt = Math.max(Date.now() + 1000, s.endAt + delta * 1000)
      const n = { ...s, endAt, totalSec: Math.max(1, s.totalSec + delta) }
      void setSetting('timer', n)
      return n
    })
  }, [])

  const skip = useCallback(() => {
    setState(null)
    setFinished(false)
    void setSetting('timer', null)
  }, [])

  const api = useMemo<TimerApi>(
    () => ({ state, remaining, finished, minimized, start, adjust, skip, dismiss: skip, setMinimized }),
    [state, remaining, finished, minimized, start, adjust, skip],
  )

  if (!loaded) return null
  return (
    <TimerContext.Provider value={api}>
      {children}
      <TimerOverlay />
    </TimerContext.Provider>
  )
}

export function useTimer(): TimerApi {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer hors TimerProvider')
  return ctx
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const RING = 2 * Math.PI * 46

function TimerOverlay() {
  const t = useTimer()
  if (!t.state) return null
  const left = t.state.totalSec > 0 ? Math.min(1, t.remaining / t.state.totalSec) : 0

  if (t.finished) {
    return (
      <div className="timer-full timer-finished" onClick={t.dismiss} role="button">
        <div className="timer-word">Repos terminé</div>
        <div className="timer-big">Go</div>
        <div className="timer-sub">{t.state.label}</div>
        <button className="timer-skip" onClick={t.dismiss}>Reprendre</button>
      </div>
    )
  }

  if (t.minimized) {
    return (
      <button className="timer-mini" onClick={() => t.setMinimized(false)}>
        <span className="timer-mini-time">{fmt(t.remaining)}</span>
        <span className="timer-mini-label">{t.state.label}</span>
        <span className="timer-mini-skip" onClick={(e) => { e.stopPropagation(); t.skip() }}>Passer</span>
      </button>
    )
  }

  return (
    <div className="timer-full">
      <button className="timer-reduce" onClick={() => t.setMinimized(true)}>Réduire</button>
      <div className="timer-disc">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="track" cx="50" cy="50" r="46" />
          <circle className="left" cx="50" cy="50" r="46" strokeDasharray={RING} strokeDashoffset={RING * (1 - left)} />
        </svg>
        <div className="timer-center">
          <div className="timer-word">Repos</div>
          <div className="timer-big">{fmt(t.remaining)}</div>
        </div>
      </div>
      <div className="timer-sub">{t.state.label}</div>
      <div className="timer-actions">
        <button onClick={() => t.adjust(-15)}>−15 s</button>
        <button onClick={() => t.adjust(15)}>+15 s</button>
      </div>
      <button className="timer-skip" onClick={t.skip}>Passer le repos</button>
    </div>
  )
}
