// Runs after `next build`. The standalone server (.next/standalone/server.js)
// doesn't include static assets by design (Next expects a CDN in front of it)
// — for a single-laptop deployment there is no CDN, so we copy them in
// ourselves. Uses fs.cpSync instead of `cp -r` so this works identically on
// Windows and elsewhere.
import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('.next/standalone not found — did `next build` run with output: "standalone"?')
  process.exit(1)
}

cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true })
cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })

console.log('Copied public/ and .next/static/ into .next/standalone/')
