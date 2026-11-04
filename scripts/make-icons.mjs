// Génère les icônes PNG (fond sombre + haltère orange) sans dépendance externe.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x / size, y / size)
      const i = y * (size * 4 + 1) + 1 + x * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
const BG = [18, 33, 46, 255], ACC = [245, 197, 24, 255], TR = [0, 0, 0, 0]
const inRect = (x, y, cx, cy, w, h) => Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2
function dumbbell(x, y) {
  if (inRect(x, y, 0.5, 0.5, 0.56, 0.08)) return true
  for (const cx of [0.24, 0.76]) if (inRect(x, y, cx, 0.5, 0.1, 0.42)) return true
  for (const cx of [0.13, 0.87]) if (inRect(x, y, cx, 0.5, 0.07, 0.3)) return true
  return false
}
const rounded = (x, y, r) => {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0)
  return dx * dx + dy * dy <= r * r
}
const drawRounded = (x, y) => (!rounded(x, y, 0.2) ? TR : dumbbell(x, y) ? ACC : BG)
const drawSquare = (x, y) => (dumbbell(x, y) ? ACC : BG)
mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, drawRounded))
writeFileSync('public/icons/icon-512.png', png(512, drawSquare))
writeFileSync('public/icons/apple-touch-icon.png', png(180, drawSquare))
writeFileSync('public/icons/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#12212e"/><rect x="22" y="46" width="56" height="8" fill="#f5c518"/><rect x="19" y="29" width="10" height="42" fill="#f5c518"/><rect x="71" y="29" width="10" height="42" fill="#f5c518"/><rect x="9.5" y="35" width="7" height="30" fill="#f5c518"/><rect x="83.5" y="35" width="7" height="30" fill="#f5c518"/></svg>`)
console.log('icônes générées')
