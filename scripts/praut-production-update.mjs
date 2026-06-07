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
  node scripts/praut-production-update.mjs [--upstream-ref <ref>] [--push] [--create-pr]
                                           [--skip-expensive-validation] [--allow-core]
                                           [--manifest <path>]

Runs the production-safe Praut update pipeline:
  1. create a Huly update branch using praut-upstream-update in no-PR mode
  2. re-check overlay/governance/test gates
  3. write markdown and JSON reports
  4. push/create PR only when production gates pass
`)
}

function parseArgs (argv) {
  const opts = {
    upstreamRef: undefined,
    push: false,
    createPr: false,
    allowCore: false,
    skipExpensiveValidation: false,
    manifestPath: defaultManifestPath
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upstream-ref' || arg === '--ref') opts.upstreamRef = requiredValue(argv, ++i, arg)
    else if (arg === '--manifest') opts.manifestPath = path.resolve(repoRoot, requiredValue(argv, ++i, arg))
    else if (arg === '--push') opts.push = true
    else if (arg === '--create-pr') opts.createPr = true
    else if (arg === '--allow-core') opts.allowCore = true
    else if (arg === '--skip-expensive-validation') opts.skipExpensiveValidation = true
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

function run (cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    shell: options.shell ?? false,
    stdio: options.capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    maxBuffer: 1024 * 1024 * 200
  })
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`
  return {
    ok: res.status === 0,
    status: res.status,
    output
  }
}

function mustRun (cmd, args, options = {}) {
  const res = run(cmd, args, options)
  if (!res.ok) {
    throw new Error(`${cmd} ${args.join(' ')} failed${res.output.trim() !== '' ? `: ${res.output.trim()}` : ''}`)
  }
  return res
}

function gitOutput (args) {
  return mustRun('git', args, { capture: true }).output.trim()
}

function currentBranch () {
  return gitOutput(['branch', '--show-current'])
}

function currentCommit () {
  return gitOutput(['rev-parse', 'HEAD'])
}

function createUpdateBranch (manifest, manifestPath, upstreamRef) {
  const beforeBranch = currentBranch()
  const beforeCommit = currentCommit()
  const res = run(process.execPath, [
    'scripts/praut-upstream-update.mjs',
    '--upstream-ref',
    upstreamRef,
    '--skip-validation',
    '--manifest',
    normalizePath(path.relative(repoRoot, manifestPath))
  ], { capture: true })

  const branch = currentBranch()
  const commit = currentCommit()
  const noChanges = /No changes to commit/.test(res.output)
  return {
    ok: res.ok,
    output: res.output,
    branch,
    commit,
    beforeBranch,
    beforeCommit,
    noChanges,
    changed: commit !== beforeCommit || branch !== beforeBranch,
    baseBranch: manifest.praut.baseBranch
  }
}

function renderCommand (command, vars) {
  return command.replaceAll('${UPSTREAM_REF}', shellQuote(vars.upstreamRef))
}

function shellQuote (value) {
  return String(value).replace(/(["\\$`])/g, '\\$1')
}

function parseGovernanceOutput (output) {
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return undefined
  try {
    return JSON.parse(output.slice(start, end + 1))
  } catch {
    return undefined
  }
}

function shouldSkipGate (gate, opts) {
  if (!opts.skipExpensiveValidation) return false
  return ['changed', 'build', 'validate'].includes(gate.name)
}

function runGates (manifest, opts, vars) {
  const gates = []

  for (const gate of manifest.productionUpdate.gates) {
    if (shouldSkipGate(gate, opts)) {
      gates.push({ name: gate.name, command: gate.command, ok: true, skipped: true, output: 'Skipped by --skip-expensive-validation.' })
      continue
    }
    const command = renderCommand(gate.command, vars)
    const res = run(command, [], { shell: true, capture: true, env: { UPSTREAM_REF: vars.upstreamRef } })
    const item = {
      name: gate.name,
      command,
      ok: res.ok,
      status: res.status,
      output: res.output.trim()
    }
    if (gate.name === 'governance') item.governance = parseGovernanceOutput(res.output)
    gates.push(item)
  }

  return gates
}

function evaluateGates (manifest, gates, opts) {
  const governance = gates.find((gate) => gate.name === 'governance')?.governance
  const failedValidation = gates.filter((gate) => !gate.ok)
  const coreCount = governance?.summary?.core ?? 0
  const dirtyUnapprovedCount = governance?.dirtyUnapproved?.length ?? 0
  const blockOn = manifest.productionUpdate.blockOn
  const blockers = []

  if (blockOn.core === true && coreCount > 0 && !opts.allowCore) blockers.push(`core differences: ${coreCount}`)
  if (blockOn.dirtyUnapproved === true && dirtyUnapprovedCount > 0 && !opts.allowCore) {
    blockers.push(`dirty unapproved files: ${dirtyUnapprovedCount}`)
  }
  if (blockOn.failedValidation === true && failedValidation.length > 0) {
    blockers.push(`failed gates: ${failedValidation.map((gate) => gate.name).join(', ')}`)
  }

  return {
    ok: blockers.length === 0,
    blockers,
    governance,
    failedValidation
  }
}

function reportPaths (manifest) {
  return {
    markdown: path.resolve(repoRoot, manifest.productionUpdate.reports.markdown),
    json: path.resolve(repoRoot, manifest.productionUpdate.reports.json)
  }
}

function writeReports (manifest, report) {
  const paths = reportPaths(manifest)
  mkdirSync(path.dirname(paths.markdown), { recursive: true })
  mkdirSync(path.dirname(paths.json), { recursive: true })
  writeFileSync(paths.markdown, buildMarkdownReport(manifest, report))
  writeFileSync(paths.json, `${JSON.stringify(report, null, 2)}\n`)

  const stepSummary = process.env.GITHUB_STEP_SUMMARY
  if (stepSummary != null && stepSummary !== '') {
    writeFileSync(stepSummary, `${buildMarkdownReport(manifest, report)}\n`, { flag: 'a' })
  }

  console.log(`Markdown report: ${normalizePath(path.relative(repoRoot, paths.markdown))}`)
  console.log(`JSON report: ${normalizePath(path.relative(repoRoot, paths.json))}`)
}

function buildMarkdownReport (manifest, report) {
  const governanceSummary = report.evaluation.governance?.summary
  const transforms = manifest.transforms.map((transform) => {
    const targets = transform.targets.map((target) => `\`${target}\``).join(', ')
    return `- \`${transform.name}\` (${transform.owner}, ${transform.reapply ?? 'manual'}): ${targets}`
  })

  return `# PRAUT Production Update Report

- Status: **${report.evaluation.ok ? 'PASS' : 'BLOCKED'}**
- Upstream ref: \`${report.upstreamRef}\`
- Update branch: \`${report.update.branch}\`
- Update commit: \`${report.update.commit}\`
- Base branch: \`${manifest.praut.baseBranch}\`
- PR creation requested: \`${report.options.createPr ? 'yes' : 'no'}\`
- Push requested: \`${report.options.push ? 'yes' : 'no'}\`

## Blockers

${report.evaluation.blockers.length === 0 ? '- None' : report.evaluation.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Governance

${governanceSummary == null
  ? '- Governance JSON was not available.'
  : Object.entries(governanceSummary).map(([key, value]) => `- ${key}: \`${value}\``).join('\n')}

## Gates

${report.gates.map((gate) => `- ${gate.ok ? 'PASS' : 'FAIL'}${gate.skipped === true ? ' SKIP' : ''} \`${gate.name}\``).join('\n')}

## Reapplied / Reviewed Transforms

${transforms.join('\n')}

## Required Agents

${manifest.productionUpdate.requiredAgents.map((agent) => `- \`${agent}\``).join('\n')}

## Next Step

${report.evaluation.ok
  ? `Review the PR/update branch and merge only after GitHub CI is green.`
  : `Do not merge this update. Resolve blockers, rerun production update, and attach this report to the review.`}
`
}

function createPullRequest (manifest, report) {
  const paths = reportPaths(manifest)
  const title = `Production Huly update for PRAUT: ${report.upstreamRef}`
  const args = [
    'pr',
    'create',
    '--base',
    manifest.praut.baseBranch,
    '--head',
    report.update.branch,
    '--title',
    title,
    '--body-file',
    paths.markdown
  ]
  const repo = process.env.GITHUB_REPOSITORY
  if (repo != null && repo !== '') args.splice(2, 0, '--repo', repo)
  mustRun('gh', args)
}

function pushBranch (manifest, branch) {
  mustRun('git', ['push', '--force-with-lease', '-u', manifest.praut.originRemote, branch])
}

function main () {
  let manifest
  try {
    const opts = parseArgs(process.argv.slice(2))
    if (opts.help) {
      usage()
      return
    }

    manifest = readJson(opts.manifestPath)
    const upstreamRef = opts.upstreamRef ?? manifest.upstream.defaultRef

    mustRun(process.execPath, ['scripts/praut-governance.mjs', 'check-manifest'])
    const update = createUpdateBranch(manifest, opts.manifestPath, upstreamRef)
    if (!update.ok) throw new Error(`Update branch creation failed: ${update.output.trim()}`)

    const gates = runGates(manifest, opts, { upstreamRef })
    const evaluation = evaluateGates(manifest, gates, opts)
    const report = {
      generatedAt: new Date().toISOString(),
      upstreamRef,
      options: {
        push: opts.push,
        createPr: opts.createPr,
        allowCore: opts.allowCore,
        skipExpensiveValidation: opts.skipExpensiveValidation
      },
      update,
      gates,
      evaluation
    }
    writeReports(manifest, report)

    if (!evaluation.ok) {
      process.exitCode = 1
      return
    }

    if ((opts.push || opts.createPr) && !update.noChanges) {
      pushBranch(manifest, update.branch)
    }
    if (opts.createPr && !update.noChanges) {
      createPullRequest(manifest, report)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

main()
