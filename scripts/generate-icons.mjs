// One-shot script to generate PWA PNG icons from public/icons/icon.svg.
// Run with: npm run gen-icons
//
// Re-run only when the base SVG changes; the resulting PNGs are committed to git.

import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ICONS_DIR = join(ROOT, 'public', 'icons')
const SOURCE_SVG = join(ICONS_DIR, 'icon.svg')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync(ICONS_DIR, { recursive: true })
const svg = readFileSync(SOURCE_SVG)

console.log('Generating PWA icons from', SOURCE_SVG)

await Promise.all(
  SIZES.map(async (size) => {
    const out = join(ICONS_DIR, `icon-${size}x${size}.png`)
    await sharp(svg)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log(`  ✓ icon-${size}x${size}.png`)
  })
)

console.log('Done.')
