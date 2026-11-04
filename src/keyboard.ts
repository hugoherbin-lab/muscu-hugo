/** Sur iPhone, le clavier recouvre les éléments fixés en bas : on publie sa hauteur dans la variable CSS --kb. */
export function trackKeyboard(): void {
  const vv = window.visualViewport
  if (!vv) return
  const update = () => {
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`)
  }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
}
