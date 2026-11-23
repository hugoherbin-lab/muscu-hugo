/**
 * Mises à jour de l'app. La nouvelle version s'installe en arrière-plan, mais la page n'est rechargée
 * que hors d'une séance : jamais au milieu d'une saisie. Elle s'applique dès le retour à l'accueil.
 */
let pending = false
const inSession = () => /^#\/seance\/[^/]+$/.test(location.hash)

/** Applique une mise à jour en attente si l'écran courant n'est pas une séance. Appelé à chaque changement d'écran. */
export function applyPendingUpdate(): void {
  if (!pending || inSession()) return
  pending = false
  location.reload()
}

export function registerUpdates(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  let hadController = !!sw.controller
  sw.addEventListener('controllerchange', () => {
    // Première installation : rien à recharger, la page est déjà la bonne.
    if (!hadController) {
      hadController = true
      return
    }
    pending = true
    applyPendingUpdate()
  })
  const base = import.meta.env.BASE_URL
  sw.register(`${base}sw.js`, { scope: base })
    .then((reg) => {
      // Une app installée reste ouverte des jours : on revérifie à chaque retour au premier plan.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => undefined)
      })
    })
    .catch(() => undefined)
}
