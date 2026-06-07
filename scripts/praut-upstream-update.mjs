#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const defaultManifestPath = path.join(repoRoot, 'praut.overlay.json')

function usage () {
  console.log(`Usage:
  node scripts/praut-upstream-update.mjs [--upstream-ref <ref>] [--dry-run] [--push] [--create-pr]
                                      [--skip-validation] [--manifest <path>]

Creates a Praut update branch for a Huly upstream ref. The script never merges to develop.
The update branch is intentionally squashed into one DCO-signed commit so upstream commits with
foreign or missing sign-offs do not block the Praut PR.
`)
}

function parseArgs (argv) {
  const opts = {
    upstreamRef: undefined,
    dryRun: false,
    push: false,
    createPr: false,
    skipValidation: false,
    manifestPath: defaultManifestPath
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upstream-ref' || arg === '--ref') opts.upstreamRef = requiredValue(argv, ++i, arg)
    else if (arg === '--manifest') opts.manifestPath = path.resolve(repoRoot, requiredValue(argv, ++i, arg))
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--push') opts.push = true
    else if (arg === '--create-pr') opts.createPr = true
    else if (arg === '--skip-validation') opts.skipValidation = true
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

function readJson (filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function normalizePath (filePath) {
  return filePath.replaceAll(path.sep, '/').replace(/^\.\//, '')
}

function run (cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    maxBuffer: 1024 * 1024 * 200
  })
  if (res.status !== 0) {
    const detail = options.capture ? (res.stderr || res.stdout || '').trim() : ''
    throw new Error(`${cmd} ${args.join(' ')} failed${detail !== '' ? `: ${detail}` : ''}`)
  }
  return res.stdout ?? ''
}

function git (args, options = {}) {
  return run('git', args, options)
}

function nodeScript (script, args = []) {
  return run(process.execPath, [script, ...args])
}

function shellCommand (command) {
  const res = spawnSync(command, { cwd: repoRoot, shell: true, stdio: 'inherit', encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`${command} failed`)
}

function gitOutput (args) {
  return git(args, { capture: true }).trim()
}

function ensureCleanTree () {
  const status = gitOutput(['status', '--porcelain', '--untracked-files=all'])
  if (status !== '') throw new Error('Working tree is not clean. Commit or stash current changes before running upstream update.')
}

function ensureRemote (manifest) {
  const remoteName = manifest.upstream.remoteName
  const remotes = gitOutput(['remote']).split('\n').filter(Boolean)
  if (!remotes.includes(remoteName)) {
    git(['remote', 'add', remoteName, manifest.upstream.url])
    return
  }
  const current = gitOutput(['remote', 'get-url', remoteName])
  if (current !== manifest.upstream.url) {
    git(['remote', 'set-url', remoteName, manifest.upstream.url])
  }
}

function safeBranchName (manifest, upstreamRef) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const safeRef = upstreamRef.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${manifest.praut.updateBranchPrefix}-${stamp}-${safeRef}`
}

function writeReport (report) {
  const reportPath = path.join(repoRoot, '.cache', 'praut-update-report.md')
  mkdirSync(path.dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, report)
  const stepSummary = process.env.GITHUB_STEP_SUMMARY
  if (stepSummary != null && stepSummary !== '') {
    writeFileSync(stepSummary, `${report}\n`, { flag: 'a' })
  }
  console.log(`Report: ${normalizePath(path.relative(repoRoot, reportPath))}`)
}

function buildReport ({ manifest, upstreamRef, branchName, upstreamSha, updateCommit, validation }) {
  return `# Praut Upstream Update Report

- Upstream: \`${manifest.upstream.url}\`
- Upstream ref: \`${upstreamRef}\`
- Upstream SHA: \`${upstreamSha}\`
- Praut base branch: \`${manifest.praut.baseBranch}\`
- Update branch: \`${branchName}\`
- Update commit: \`${updateCommit ?? 'not created'}\`
- Auto-merge to production: \`no\`

## Required Review

- Review all merge conflicts if the update branch was not created cleanly.
- Review every governance item marked \`core\` or \`review\`.
- Confirm generated branding files still match Praut release intent.

## Validation

${validation.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} \`${item.name}\``).join('\n')}

## Next Step

Open a PR from \`${branchName}\` into \`${manifest.praut.baseBranch}\` and assign \`upstream-sync-agent\`, \`qa-release-agent\`, and any owner listed by governance output.
`
}

function runValidation (manifest, upstreamRef) {
  const validation = []
  const steps = [
    ['governance manifest', () => nodeScript('scripts/praut-governance.mjs', ['check-manifest'])],
    ['overlay check', () => nodeScript('scripts/praut-apply-overlay.mjs', ['--check'])],
    ['governance check', () => nodeScript('scripts/praut-governance.mjs', ['check', '--ref', upstreamRef])],
    ['changed validate/test', () => shellCommand(manifest.validation.changed)],
    ['build', () => shellCommand(manifest.validation.build)],
    ['validate', () => shellCommand(manifest.validation.validate)],
    ['smoke', () => shellCommand(manifest.validation.smoke)]
  ]
  for (const [name, fn] of steps) {
    try {
      fn()
      validation.push({ name, ok: true })
    } catch (err) {
      validation.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return validation
}

function createPullRequest (manifest, branchName, report) {
  const title = `Update Huly upstream for Praut: ${branchName.split('/').pop()}`
  const bodyPath = path.join(repoRoot, '.cache', 'praut-update-pr-body.md')
  writeFileSync(bodyPath, report)
  const args = [
    'pr',
    'create',
    '--base',
    manifest.praut.baseBranch,
    '--head',
    branchName,
    '--title',
    title,
    '--body-file',
    bodyPath
  ]
  const repo = process.env.GITHUB_REPOSITORY
  if (repo != null && repo !== '') args.splice(2, 0, '--repo', repo)
  run('gh', args)
}

function hasStagedChanges () {
  const res = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: repoRoot, encoding: 'utf8' })
  if (res.status === 0) return false
  if (res.status === 1) return true
  throw new Error('git diff --cached --quiet failed')
}

function createSignedUpdateCommit (manifest, upstreamRef, upstreamSha) {
  git(['add', '-A'])
  if (!hasStagedChanges()) return null
  git([
    'commit',
    '--signoff',
    '-m',
    `Update Huly upstream for Praut: ${upstreamRef}`,
    '-m',
    `Upstream: ${manifest.upstream.url}`,
    '-m',
    `Upstream-SHA: ${upstreamSha}`
  ])
  return gitOutput(['rev-parse', 'HEAD'])
}

function main () {
  let validation = []
  try {
    const opts = parseArgs(process.argv.slice(2))
    if (opts.help) {
      usage()
      return
    }
    const manifest = readJson(opts.manifestPath)
    const upstreamRef = opts.upstreamRef ?? manifest.upstream.defaultRef
    const branchName = safeBranchName(manifest, upstreamRef)

    if (opts.dryRun) {
      console.log(`Would fetch ${manifest.upstream.url} ${upstreamRef}`)
      console.log(`Would create branch ${branchName} from ${manifest.praut.baseBranch}`)
      console.log('Would merge upstream, apply overlay, update governance, run validation, and prepare PR metadata.')
      return
    }

    ensureCleanTree()
    ensureRemote(manifest)
    git(['fetch', manifest.praut.originRemote, manifest.praut.baseBranch])
    git(['fetch', manifest.upstream.remoteName, upstreamRef])
    const upstreamSha = gitOutput(['rev-parse', `${manifest.upstream.remoteName}/${upstreamRef}`])
    const baseRef = `${manifest.praut.originRemote}/${manifest.praut.baseBranch}`
    git(['checkout', '-B', branchName, baseRef])
    git(['merge', '--squash', upstreamSha])
    nodeScript('scripts/praut-apply-overlay.mjs')
    nodeScript('scripts/praut-governance.mjs', ['update-doc', '--ref', upstreamRef])
    const updateCommit = createSignedUpdateCommit(manifest, upstreamRef, upstreamSha)

    if (updateCommit == null) {
      console.log(`No changes to commit after applying ${manifest.upstream.remoteName}/${upstreamRef}.`)
      const report = buildReport({ manifest, upstreamRef, branchName, upstreamSha, updateCommit, validation })
      writeReport(report)
      return
    }

    if (!opts.skipValidation) {
      validation = runValidation(manifest, upstreamRef)
    }

    const report = buildReport({ manifest, upstreamRef, branchName, upstreamSha, updateCommit, validation })
    writeReport(report)

    const failedValidation = validation.filter((item) => !item.ok)

    if (opts.push || opts.createPr) {
      git(['push', '--force-with-lease', '-u', manifest.praut.originRemote, branchName])
    }
    if (opts.createPr) createPullRequest(manifest, branchName, report)
    if (failedValidation.length > 0) {
      throw new Error(`Validation failed: ${failedValidation.map((item) => item.name).join(', ')}`)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

main()
