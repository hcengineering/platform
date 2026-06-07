#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const manifestPath = path.join(repoRoot, 'praut.overlay.json')

function readJson (filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function assertFile (filePath) {
  const absolute = path.join(repoRoot, filePath)
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${filePath}`)
}

function assertIncludes (filePath, text) {
  const absolute = path.join(repoRoot, filePath)
  const content = readFileSync(absolute, 'utf8')
  if (!content.includes(text)) throw new Error(`${filePath} does not contain required marker: ${text}`)
}

function assertBranding (filePath, hosts, title) {
  assertFile(filePath)
  const json = readJson(path.join(repoRoot, filePath))
  for (const host of hosts) {
    if (json[host]?.title !== title) throw new Error(`${filePath} missing Praut branding for ${host}`)
  }
}

function main () {
  try {
    assertFile('praut.overlay.json')
    const manifest = readJson(manifestPath)
    for (const file of manifest.smoke.requiredFiles ?? []) assertFile(file)
    for (const marker of manifest.smoke.generatedMarkers ?? []) {
      assertIncludes('docs/praut-fork-governance.md', `BEGIN GENERATED: ${marker}`)
      assertIncludes('docs/praut-fork-governance.md', `END GENERATED: ${marker}`)
    }
    assertBranding('dev/branding.praut.json', manifest.branding.localHosts, manifest.branding.title)
    assertBranding('dev/prod/public/branding.praut.json', manifest.branding.productionHosts, manifest.branding.title)
    console.log('Praut smoke check passed.')
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

main()
