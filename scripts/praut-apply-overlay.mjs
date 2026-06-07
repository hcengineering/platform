#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const defaultManifestPath = path.join(repoRoot, 'praut.overlay.json')

function usage () {
  console.log(`Usage:
  node scripts/praut-apply-overlay.mjs [--dry-run] [--check] [--manifest <path>]

Applies Praut-owned overlay transforms declared in praut.overlay.json.
`)
}

function parseArgs (argv) {
  const opts = { dryRun: false, check: false, manifestPath: defaultManifestPath }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--check') opts.check = true
    else if (arg === '--manifest') opts.manifestPath = path.resolve(repoRoot, requiredValue(argv, ++i, arg))
    else if (arg === '-h' || arg === '--help') opts.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return opts
}

function requiredValue (args, index, flag) {
  const value = args[index]
  if (value == null || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
  return value
}

function normalizePath (filePath) {
  return filePath.replaceAll(path.sep, '/').replace(/^\.\//, '')
}

function readJson (filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function stableJson (value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function validateManifest (manifest) {
  for (const key of ['version', 'paths', 'branding', 'transforms']) {
    if (manifest[key] == null) throw new Error(`Invalid Praut overlay manifest: missing ${key}`)
  }
  if (!Array.isArray(manifest.transforms)) throw new Error('Invalid Praut overlay manifest: transforms must be an array')
  if (!Array.isArray(manifest.branding.localHosts)) throw new Error('Invalid Praut overlay manifest: branding.localHosts must be an array')
  if (!Array.isArray(manifest.branding.productionHosts)) throw new Error('Invalid Praut overlay manifest: branding.productionHosts must be an array')
}

function brandingLinks (assetBasePath) {
  const base = assetBasePath.replace(/\/$/, '')
  return [
    { rel: 'manifest', href: `${base}/site.webmanifest` },
    { rel: 'icon', href: `${base}/favicon.svg`, type: 'image/svg+xml' },
    { rel: 'shortcut icon', href: `${base}/favicon.ico`, sizes: 'any' },
    { rel: 'apple-touch-icon', href: `${base}/apple-touch-icon.png` }
  ]
}

function localBranding (branding) {
  const result = {}
  for (const host of branding.localHosts) {
    result[host] = {
      key: 'praut',
      title: branding.title,
      protocol: host.includes('localhost') || host.includes('.local') ? 'http' : 'https',
      language: branding.defaultLanguage,
      lastNameFirst: 'false'
    }
  }
  return result
}

function productionBranding (branding) {
  const result = {}
  for (const host of branding.productionHosts) {
    result[host] = {
      title: branding.title,
      languages: branding.languages,
      defaultLanguage: branding.defaultLanguage,
      defaultApplication: branding.defaultApplication,
      defaultSpecial: branding.defaultSpecial,
      lastNameFirst: 'false',
      links: brandingLinks(branding.assetBasePath ?? '/praut')
    }
  }
  return result
}

function plannedFileContent (target, manifest) {
  if (target === 'dev/branding.praut.json') return stableJson(localBranding(manifest.branding))
  if (target === 'dev/prod/public/branding.praut.json') return stableJson(productionBranding(manifest.branding))
  throw new Error(`Unsupported branding target: ${target}`)
}

function ensureInsideRepo (target) {
  const absolute = path.resolve(repoRoot, target)
  if (!absolute.startsWith(`${repoRoot}${path.sep}`)) throw new Error(`Refusing to write outside repo: ${target}`)
  return absolute
}

function applyBrandingTransform (transform, manifest, opts) {
  const targets = transform.targets ?? []
  for (const target of targets) {
    const normalized = normalizePath(target)
    const absolute = ensureInsideRepo(normalized)
    const next = plannedFileContent(normalized, manifest)
    const current = existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
    if (opts.check) {
      if (current !== next) throw new Error(`Overlay check failed: ${normalized} is missing or stale`)
      console.log(`OK ${normalized}`)
      continue
    }
    if (opts.dryRun) {
      console.log(`Would write ${normalized}`)
      continue
    }
    mkdirSync(path.dirname(absolute), { recursive: true })
    writeFileSync(absolute, next)
    console.log(`Wrote ${normalized}`)
  }
}

function main () {
  try {
    const opts = parseArgs(process.argv.slice(2))
    if (opts.help) {
      usage()
      return
    }
    const manifest = readJson(opts.manifestPath)
    validateManifest(manifest)

    for (const transform of manifest.transforms) {
      if (transform.kind === 'branding-json') applyBrandingTransform(transform, manifest, opts)
      else if (transform.kind === 'governance-update') console.log(`Skip ${transform.name}: handled by praut-governance.mjs`)
      else throw new Error(`Unsupported Praut transform kind: ${transform.kind}`)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

main()
