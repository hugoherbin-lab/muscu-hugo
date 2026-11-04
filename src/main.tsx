import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/big-shoulders-stencil/latin-800.css'
import '@fontsource/atkinson-hyperlegible/latin-400.css'
import '@fontsource/atkinson-hyperlegible/latin-700.css'
import App from './App'
import { trackKeyboard } from './keyboard'
import { seedProgram } from './seed'
import './styles.css'

// Demande au navigateur de ne jamais purger nos données (IndexedDB).
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => undefined)
}

registerSW({ immediate: true })
trackKeyboard()

function render() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Le programme est chargé avant le premier affichage ; en cas d'échec, l'import manuel reste possible.
seedProgram().catch(() => undefined).finally(render)
