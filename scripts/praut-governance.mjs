#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const defaultDocPath = path.join(repoRoot, 'docs', 'praut-fork-governance.md')
const defaultManifestPath = path.join(repoRoot, 'praut.overlay.json')
const defaultBaselinePath = path.join(repoRoot, 'praut-core-baseline.json')
const defaultUpstreamUrl = 'https://github.com/hcengineering/platform'
const defaultUpstreamCache = path.join(repoRoot, '.cache', 'praut-upstream')

const generatedMarkers = {
  upstream: {
    begin: '<!-- BEGIN GENERATED: upstream-protected-inventory -->',
    end: '<!-- END GENERATED: upstream-protected-inventory -->'
  },
  custom: {
    begin: '<!-- BEGIN GENERATED: praut-customization-inventory -->',
    end: '<!-- END GENERATED: praut-customization-inventory -->'
  }
}

const ignoredPathPrefixes = [
  '.git/',
  '.cache/',
  '.rush/',
  'common/temp/',
  'common/deploy/',
  'node_modules/',
  'dist/',
  'bundle/',
  'lib/',
  'types/',
  'typings/',
  '.build/',
  '.format/',
  'coverage/'
]

const ignoredPathParts = [
  '/node_modules/',
  '/dist/',
  '/bundle/',
  '/lib/',
  '/types/',
  '/typings/',
  '/.rush/temp/'
]

const fallbackManifest = {
  upstream: { url: defaultUpstreamUrl, defaultRef: 'main', remoteName: 'upstream' },
  praut: { baseBranch: 'develop', updateBranchPrefix: 'praut/update-huly', originRemote: 'origin' },
  paths: {
    green: [
      '^plugins/praut-[^/]+(?:/|$)',
      '^server-plugins/praut-[^/]+(?:/|$)',
      '^models/praut-[^/]+(?:/|$)',
      '^packages/praut-[^/]+(?:/|$)',
      '^services/praut-[^/]+(?:/|$)',
      '^docs/praut-[^/]+(?:/|$)',
      '^scripts/praut-[^/]+$',
      '^dev/docker-compose\\.praut.*\\.ya?ml$',
      '^dev/branding.*\\.json$',
      '^dev/prod/public/branding.*\\.json$',
      '^desktop-package/src/.*Praut.*$',
      '^qms-desktop-package/src/.*Praut.*$'
    ],
    yellow: [],
    red: [],
    exceptions: [
      { path: 'docs/praut-fork-governance.md' },
      { path: 'scripts/praut-governance.mjs' },
      { path: '.gitignore' }
    ]
  }
}

function usage () {
  console.log(`Usage:
  node scripts/praut-governance.mjs update-doc [--dry-run] [--upstream <url-or-path>] [--ref <ref>]
  node scripts/praut-governance.mjs diff-custom [--upstream <url-or-path>] [--ref <ref>]
  node scripts/praut-governance.mjs check [--upstream <url-or-path>] [--ref <ref>]
  node scripts/praut-governance.mjs generate-baseline [--upstream <url-or-path>] [--ref <ref>]
  node scripts/praut-governance.mjs check-manifest

Options:
  --upstream <url-or-path>  GitHub URL or local checkout path. Default: ${defaultUpstreamUrl}
  --ref <ref>              Upstream ref to inspect. Default: main
  --cache-dir <path>       Clone/update cache. Default: .cache/praut-upstream
  --doc <path>             Governance markdown path. Default: docs/praut-fork-governance.md
  --manifest <path>        Praut overlay manifest. Default: praut.overlay.json
  --baseline <path>        Approved historical core baseline. Default: praut-core-baseline.json
  --json                   Print machine-readable JSON for diff-custom/check.
  --dry-run                Print generated markdown instead of writing update-doc changes.
  --refresh                Delete cache before cloning upstream.
`)
}

function parseArgs (argv) {
  const [command, ...rest] = argv
  const opts = {
    command: command === '-h' || command === '--help' ? 'help' : command,
    manifestPath: defaultManifestPath,
    upstream: undefined,
    ref: undefined,
    cacheDir: defaultUpstreamCache,
    docPath: defaultDocPath,
    baselinePath: defaultBaselinePath,
    json: false,
    dryRun: false,
    refresh: false
  }

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--upstream') opts.upstream = requiredValue(rest, ++i, arg)
    else if (arg === '--ref') opts.ref = requiredValue(rest, ++i, arg)
    else if (arg === '--cache-dir') opts.cacheDir = path.resolve(repoRoot, requiredValue(rest, ++i, arg))
    else if (arg === '--doc') opts.docPath = path.resolve(repoRoot, requiredValue(rest, ++i, arg))
    else if (arg === '--manifest') opts.manifestPath = path.resolve(repoRoot, requiredValue(rest, ++i, arg))
    else if (arg === '--baseline') opts.baselinePath = path.resolve(repoRoot, requiredValue(rest, ++i, arg))
    else if (arg === '--json') opts.json = true
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--refresh') opts.refresh = true
    else if (arg === '-h' || arg === '--help') opts.command = 'help'
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return opts
}

function readJson (filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function loadManifest (manifestPath) {
  if (!existsSync(manifestPath)) return fallbackManifest
  const manifest = readJson(manifestPath)
  validateManifest(manifest, manifestPath)
  return manifest
}

function validateManifest (manifest, manifestPath = defaultManifestPath) {
  const requiredTop = ['version', 'upstream', 'praut', 'paths', 'branding', 'transforms', 'validation', 'smoke']
  for (const key of requiredTop) {
    if (manifest[key] == null) throw new Error(`Invalid manifest ${normalizePath(path.relative(repoRoot, manifestPath))}: missing ${key}`)
  }
  for (const key of ['green', 'yellow', 'red', 'exceptions']) {
    if (!Array.isArray(manifest.paths[key])) throw new Error(`Invalid manifest paths.${key}: expected array`)
  }
  for (const pattern of [...manifest.paths.green, ...manifest.paths.yellow, ...manifest.paths.red]) {
    try {
      new RegExp(pattern)
    } catch (err) {
      throw new Error(`Invalid manifest regex ${pattern}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  for (const exception of manifest.paths.exceptions) {
    if (typeof exception.path !== 'string' || exception.path === '') {
      throw new Error('Invalid manifest exception: path is required')
    }
  }
}

function compilePatterns (manifest) {
  return {
    green: manifest.paths.green.map((pattern) => new RegExp(pattern)),
    yellow: manifest.paths.yellow.map((pattern) => new RegExp(pattern)),
    red: manifest.paths.red.map((pattern) => new RegExp(pattern)),
    exceptions: manifest.paths.exceptions.map((exception) => ({
      ...exception,
      pattern: new RegExp(`^${escapeRegExp(normalizePath(exception.path))}$`)
    }))
  }
}

function loadBaseline (baselinePath) {
  if (!existsSync(baselinePath)) return { entries: [] }
  const baseline = readJson(baselinePath)
  if (!Array.isArray(baseline.entries)) {
    throw new Error(`Invalid baseline ${normalizePath(path.relative(repoRoot, baselinePath))}: entries must be an array`)
  }
  return baseline
}

function baselineKey (change) {
  return `${change.status}\t${change.path}`
}

function compileBaseline (baseline) {
  const entries = new Map()
  for (const entry of baseline.entries ?? []) {
    entries.set(baselineKey(entry), entry)
  }
  return entries
}

function isBaselineMatch (change, baselineEntries) {
  if (change.kind !== 'core') return false
  const baseline = baselineEntries.get(baselineKey(change))
  if (baseline == null) return false
  return (
    (baseline.localHash ?? null) === (change.localHash ?? null) &&
    (baseline.upstreamHash ?? null) === (change.upstreamHash ?? null)
  )
}

function applyBaseline (changes, baseline) {
  const baselineEntries = compileBaseline(baseline)
  return changes.map((change) => {
    if (!isBaselineMatch(change, baselineEntries)) return change
    return { ...change, kind: 'baseline' }
  })
}

function escapeRegExp (value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function requiredValue (args, index, flag) {
  const value = args[index]
  if (value == null || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

function runGit (args, options = {}) {
  const res = spawnSync('git', args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 200
  })
  if (res.status !== 0) {
    const stderr = res.stderr?.trim()
    const stdout = res.stdout?.trim()
    throw new Error(`git ${args.join(' ')} failed${stderr !== '' ? `: ${stderr}` : stdout !== '' ? `: ${stdout}` : ''}`)
  }
  return res.stdout
}

function isUrl (value) {
  return /^https?:\/\//.test(value) || /^git@/.test(value)
}

function resolveUpstream (opts) {
  if (!isUrl(opts.upstream)) {
    const upstreamPath = path.resolve(repoRoot, opts.upstream)
    if (!existsSync(path.join(upstreamPath, '.git'))) {
      throw new Error(`Upstream path is not a git checkout: ${upstreamPath}`)
    }
    return upstreamPath
  }

  if (opts.refresh && existsSync(opts.cacheDir)) {
    rmSync(opts.cacheDir, { recursive: true, force: true })
  }

  mkdirSync(path.dirname(opts.cacheDir), { recursive: true })
  if (!existsSync(path.join(opts.cacheDir, '.git'))) {
    runGit(['clone', '--depth', '1', '--branch', opts.ref, opts.upstream, opts.cacheDir])
  } else {
    try {
      runGit(['fetch', '--depth', '1', 'origin', opts.ref], { cwd: opts.cacheDir })
      runGit(['checkout', 'FETCH_HEAD'], { cwd: opts.cacheDir })
    } catch (err) {
      console.warn(`Warning: could not refresh upstream cache, using existing checkout at ${opts.cacheDir}`)
      console.warn(err instanceof Error ? err.message : String(err))
    }
  }
  return opts.cacheDir
}

function normalizePath (filePath) {
  return filePath.replaceAll(path.sep, '/').replace(/^\.\//, '')
}

function isIgnored (filePath) {
  const normalized = normalizePath(filePath)
  return (
    ignoredPathPrefixes.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) ||
    ignoredPathParts.some((part) => normalized.includes(part))
  )
}

function gitFiles (cwd) {
  return trackedFileEntries(cwd)
    .map((entry) => entry.path)
}

function trackedFileEntries (cwd) {
  return runGit(['ls-files', '-s'], { cwd })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\d+\s+([0-9a-f]{40,64})\s+\d+\t(.+)$/)
      if (match == null) return undefined
      return { hash: match[1], path: match[2] }
    })
    .filter((entry) => entry !== undefined)
    .filter((entry) => !isIgnored(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path))
}

function localFileEntries () {
  const tracked = trackedFileEntries(repoRoot)
  const entries = new Map(tracked.map((entry) => [entry.path, entry]))
  const statusLines = runGit(['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)

  for (const line of statusLines) {
    const rawPath = line.slice(3).replace(/^.* -> /, '')
    const filePath = normalizePath(rawPath)
    if (isIgnored(filePath) || !existsSync(path.join(repoRoot, filePath))) continue
    const status = line.slice(0, 2)
    if (status.includes('D')) {
      entries.delete(filePath)
      continue
    }
    entries.set(filePath, {
      path: filePath,
      hash: runGit(['hash-object', '--', filePath], { cwd: repoRoot }).trim(),
      dirty: true
    })
  }
  return Array.from(entries.values()).sort((a, b) => a.path.localeCompare(b.path))
}

function gitStatusFiles () {
  const porcelain = runGit(['status', '--porcelain', '--untracked-files=all'])
  return porcelain
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => normalizePath(line.slice(3).replace(/^.* -> /, '')))
    .filter((file) => !isIgnored(file))
}

function pathKind (filePath, rules) {
  if (rules.green.some((pattern) => pattern.test(filePath))) return 'overlay'
  if (rules.exceptions.some((exception) => exception.pattern.test(filePath))) return 'exception'
  if (rules.yellow.some((pattern) => pattern.test(filePath))) return 'review'
  return 'core'
}

function compareRepos (upstreamPath, rules) {
  const upstreamEntries = trackedFileEntries(upstreamPath)
  const localEntries = localFileEntries()
  const upstreamHashes = new Map(upstreamEntries.map((entry) => [entry.path, entry.hash]))
  const localHashes = new Map(localEntries.map((entry) => [entry.path, entry.hash]))
  const upstreamFiles = new Set(upstreamHashes.keys())
  const localFiles = new Set(localHashes.keys())
  const allFiles = Array.from(new Set([...upstreamFiles, ...localFiles])).sort()

  const changes = []
  for (const file of allFiles) {
    const inUpstream = upstreamFiles.has(file)
    const inLocal = localFiles.has(file)
    let status = 'modified'
    if (!inUpstream && inLocal) status = 'added'
    else if (inUpstream && !inLocal) status = 'deleted'
    else if (upstreamHashes.get(file) === localHashes.get(file)) continue

    changes.push({
      path: file,
      status,
      kind: pathKind(file, rules),
      localHash: localHashes.get(file) ?? null,
      upstreamHash: upstreamHashes.get(file) ?? null
    })
  }
  return changes
}

function summarizeTopLevel (files) {
  const counts = new Map()
  for (const file of files) {
    const top = file.split('/')[0]
    counts.set(top, (counts.get(top) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))
}

function renderUpstreamInventory (upstreamPath, opts, rules) {
  const files = gitFiles(upstreamPath)
  const groups = summarizeTopLevel(files)
  const filesByTopLevel = new Map()
  for (const file of files) {
    const top = file.split('/')[0]
    if (!filesByTopLevel.has(top)) filesByTopLevel.set(top, [])
    filesByTopLevel.get(top).push(file)
  }
  const generated = new Date().toISOString()
  const lines = [
    `Generated from upstream \`${opts.upstream}\` ref \`${opts.ref}\` at \`${generated}\`.`,
    '',
    '| Top-level path | Tracked files | Protection rule |',
    '| --- | ---: | --- |'
  ]

  for (const group of groups) {
    const kind = pathKind(group.name, rules)
    const rule = kind === 'overlay' ? 'Praut overlay path' : kind === 'review' ? 'Reviewed shared path' : 'Protected upstream-owned path'
    lines.push(`| \`${group.name}\` | ${group.count} | ${rule} |`)
  }

  lines.push('', `Total upstream tracked files: **${files.length}**.`)
  lines.push('', '### Complete Protected File List', '')
  for (const group of groups) {
    const groupFiles = filesByTopLevel.get(group.name) ?? []
    lines.push('<details>')
    lines.push(`<summary><code>${group.name}</code> (${groupFiles.length} files)</summary>`)
    lines.push('')
    for (const file of groupFiles) {
      lines.push(`- \`${file}\``)
    }
    lines.push('')
    lines.push('</details>')
    lines.push('')
  }
  return lines.join('\n')
}

function renderCustomInventory (changes) {
  const generated = new Date().toISOString()
  const grouped = {
    overlay: changes.filter((change) => change.kind === 'overlay'),
    exception: changes.filter((change) => change.kind === 'exception'),
    review: changes.filter((change) => change.kind === 'review'),
    baseline: changes.filter((change) => change.kind === 'baseline'),
    core: changes.filter((change) => change.kind === 'core')
  }

  const lines = [`Generated at \`${generated}\` by comparing this fork against upstream.`, '']
  lines.push(`- Overlay customizations: **${grouped.overlay.length}**`)
  lines.push(`- Approved exception changes: **${grouped.exception.length}**`)
  lines.push(`- Review-required shared changes: **${grouped.review.length}**`)
  lines.push(`- Baselined historical core differences: **${grouped.baseline.length}**`)
  lines.push(`- Unapproved core differences: **${grouped.core.length}**`)

  for (const [title, items] of [
    ['Overlay Customizations', grouped.overlay],
    ['Approved Exception Changes', grouped.exception],
    ['Review Required Shared Changes', grouped.review],
    ['Baselined Historical Core Differences', grouped.baseline],
    ['Unapproved Core Differences', grouped.core]
  ]) {
    lines.push('', `### ${title}`, '')
    if (items.length === 0) {
      lines.push('_None._')
      continue
    }
    lines.push('| Status | Path |')
    lines.push('| --- | --- |')
    for (const item of items) {
      lines.push(`| ${item.status} | \`${item.path}\` |`)
    }
  }

  return lines.join('\n')
}

function replaceGeneratedBlock (doc, marker, body) {
  const start = doc.indexOf(marker.begin)
  const end = doc.indexOf(marker.end)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing generated block markers: ${marker.begin}`)
  }
  const before = doc.slice(0, start + marker.begin.length)
  const after = doc.slice(end)
  return `${before}\n${body}\n${after}`
}

function updateDoc (opts, upstreamPath, changes, rules) {
  const upstreamBody = renderUpstreamInventory(upstreamPath, opts, rules)
  const customBody = renderCustomInventory(changes)
  let doc = readFileSync(opts.docPath, 'utf8')
  doc = replaceGeneratedBlock(doc, generatedMarkers.upstream, upstreamBody)
  doc = replaceGeneratedBlock(doc, generatedMarkers.custom, customBody)

  if (opts.dryRun) {
    console.log(doc)
    return
  }
  writeFileSync(opts.docPath, doc)
  console.log(`Updated ${normalizePath(path.relative(repoRoot, opts.docPath))}`)
}

function topLevelOf (filePath) {
  return filePath.split('/')[0]
}

function generateBaseline (opts, changes) {
  const coreChanges = changes
    .filter((change) => change.kind === 'core' || change.kind === 'baseline')
    .map((change) => ({
      path: change.path,
      status: change.status,
      localHash: change.localHash,
      upstreamHash: change.upstreamHash,
      owner: 'upstream-sync-agent',
      reason: 'Historical core drift captured as baseline; must be reviewed before changing or removing.'
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status))

  const byTopLevel = summarizeTopLevel(coreChanges.map((change) => change.path))
  const baseline = {
    version: 1,
    generatedAt: new Date().toISOString(),
    upstream: opts.upstream,
    ref: opts.ref,
    policy: 'Exact hash match only. If localHash or upstreamHash changes, the entry is no longer treated as baseline.',
    summary: {
      total: coreChanges.length,
      byTopLevel: Object.fromEntries(byTopLevel.map((item) => [item.name, item.count]))
    },
    entries: coreChanges
  }

  if (opts.dryRun) {
    printJson(baseline)
    return
  }
  writeFileSync(opts.baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(`Updated ${normalizePath(path.relative(repoRoot, opts.baselinePath))}`)
}

function printDiffCustom (changes) {
  if (changes.length === 0) {
    console.log('No differences against upstream.')
    return
  }
  for (const change of changes) {
    console.log(`${change.status}\t${change.kind}\t${change.path}`)
  }
}

function printJson (payload) {
  console.log(JSON.stringify(payload, null, 2))
}

function summarizeChanges (changes) {
  return {
    overlay: changes.filter((change) => change.kind === 'overlay').length,
    exception: changes.filter((change) => change.kind === 'exception').length,
    review: changes.filter((change) => change.kind === 'review').length,
    baseline: changes.filter((change) => change.kind === 'baseline').length,
    core: changes.filter((change) => change.kind === 'core').length,
    total: changes.length
  }
}

function checkChanges (changes, rules, opts) {
  const unapproved = changes.filter((change) => change.kind === 'core')
  const dirty = gitStatusFiles()
  const dirtyUnapproved = dirty.filter((file) => pathKind(file, rules) === 'core')

  if (opts.json) {
    printJson({
      ok: unapproved.length === 0 && dirtyUnapproved.length === 0,
      summary: summarizeChanges(changes),
      unapproved,
      dirtyUnapproved
    })
    if (unapproved.length > 0 || dirtyUnapproved.length > 0) process.exitCode = 1
    return
  }

  if (unapproved.length === 0 && dirtyUnapproved.length === 0) {
    console.log('Governance check passed.')
    return
  }

  if (unapproved.length > 0) {
    console.error('Unapproved differences against upstream:')
    for (const change of unapproved.slice(0, 200)) {
      console.error(`${change.status}\t${change.path}`)
    }
    if (unapproved.length > 200) {
      console.error(`... ${unapproved.length - 200} additional entries omitted`)
    }
  }

  if (dirtyUnapproved.length > 0) {
    console.error('Unapproved local dirty files:')
    for (const file of dirtyUnapproved) {
      console.error(file)
    }
  }

  process.exitCode = 1
}

function main () {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2))
    const manifest = loadManifest(opts.manifestPath)
    opts.upstream = opts.upstream ?? manifest.upstream.url ?? defaultUpstreamUrl
    opts.ref = opts.ref ?? manifest.upstream.defaultRef ?? 'main'
    const rules = compilePatterns(manifest)

    if (opts.command === 'help' || opts.command == null) {
      usage()
      return
    }
    if (!['update-doc', 'diff-custom', 'check', 'generate-baseline', 'check-manifest'].includes(opts.command)) {
      throw new Error(`Unknown command: ${opts.command}`)
    }
    if (opts.command === 'check-manifest') {
      if (opts.json) printJson({ ok: true, manifest: normalizePath(path.relative(repoRoot, opts.manifestPath)) })
      else console.log(`Manifest check passed: ${normalizePath(path.relative(repoRoot, opts.manifestPath))}`)
      return
    }

    const upstreamPath = resolveUpstream(opts)
    const rawChanges = compareRepos(upstreamPath, rules)
    const baseline = loadBaseline(opts.baselinePath)
    const changes = applyBaseline(rawChanges, baseline)

    if (opts.command === 'update-doc') updateDoc(opts, upstreamPath, changes, rules)
    else if (opts.command === 'diff-custom') opts.json ? printJson({ summary: summarizeChanges(changes), changes }) : printDiffCustom(changes)
    else if (opts.command === 'check') checkChanges(changes, rules, opts)
    else if (opts.command === 'generate-baseline') generateBaseline(opts, rawChanges)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

main()
