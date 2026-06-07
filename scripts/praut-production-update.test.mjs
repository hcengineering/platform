import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMarkdownReport,
  evaluateGates,
  parseArgs,
  parseGovernanceOutput,
  renderCommand,
  shouldSkipGate
} from './praut-production-update.mjs'

const manifest = {
  praut: {
    baseBranch: 'develop'
  },
  transforms: [
    {
      name: 'praut-branding-files',
      owner: 'frontend-branding-agent',
      reapply: 'automatic',
      targets: ['dev/branding.praut.json']
    }
  ],
  productionUpdate: {
    requiredAgents: ['upstream-sync-agent', 'qa-release-agent'],
    blockOn: {
      core: true,
      dirtyUnapproved: true,
      failedValidation: true
    }
  }
}

const cleanGovernance = {
  ok: true,
  summary: {
    overlay: 2,
    exception: 1,
    review: 0,
    baseline: 0,
    core: 0,
    total: 3
  },
  unapproved: [],
  dirtyUnapproved: []
}

test('parseArgs supports dry-run and safety flags', () => {
  const opts = parseArgs(['--upstream-ref', 'main', '--dry-run', '--skip-expensive-validation', '--allow-core'])

  assert.equal(opts.upstreamRef, 'main')
  assert.equal(opts.dryRun, true)
  assert.equal(opts.skipExpensiveValidation, true)
  assert.equal(opts.allowCore, true)
})

test('parseGovernanceOutput extracts JSON from command output', () => {
  const parsed = parseGovernanceOutput(`noise\n${JSON.stringify(cleanGovernance)}\nmore noise`)

  assert.deepEqual(parsed, cleanGovernance)
})

test('evaluateGates passes when governance is clean and all gates pass', () => {
  const gates = [
    { name: 'manifest', ok: true },
    { name: 'governance', ok: true, governance: cleanGovernance },
    { name: 'smoke', ok: true }
  ]
  const result = evaluateGates(manifest, gates, { allowCore: false })

  assert.equal(result.ok, true)
  assert.deepEqual(result.blockers, [])
})

test('evaluateGates blocks core differences by default', () => {
  const gates = [
    {
      name: 'governance',
      ok: true,
      governance: {
        ...cleanGovernance,
        summary: { ...cleanGovernance.summary, core: 2 }
      }
    }
  ]
  const result = evaluateGates(manifest, gates, { allowCore: false })

  assert.equal(result.ok, false)
  assert.deepEqual(result.blockers, ['core differences: 2'])
})

test('evaluateGates allows core differences only with allowCore', () => {
  const gates = [
    {
      name: 'governance',
      ok: true,
      governance: {
        ...cleanGovernance,
        summary: { ...cleanGovernance.summary, core: 1 },
        dirtyUnapproved: ['foundations/core/file.ts']
      }
    }
  ]
  const result = evaluateGates(manifest, gates, { allowCore: true })

  assert.equal(result.ok, true)
  assert.deepEqual(result.blockers, [])
})

test('evaluateGates blocks failed validation gates', () => {
  const gates = [
    { name: 'governance', ok: true, governance: cleanGovernance },
    { name: 'smoke', ok: false }
  ]
  const result = evaluateGates(manifest, gates, { allowCore: false })

  assert.equal(result.ok, false)
  assert.deepEqual(result.blockers, ['failed gates: smoke'])
})

test('shouldSkipGate skips expensive validation gates only when requested', () => {
  assert.equal(shouldSkipGate({ name: 'changed' }, { skipExpensiveValidation: true }), true)
  assert.equal(shouldSkipGate({ name: 'smoke' }, { skipExpensiveValidation: true }), false)
  assert.equal(shouldSkipGate({ name: 'changed' }, { skipExpensiveValidation: false }), false)
})

test('renderCommand injects the upstream ref safely', () => {
  const command = renderCommand('node script.mjs --ref ${UPSTREAM_REF}', { upstreamRef: 'feature/"x"' })

  assert.equal(command, 'node script.mjs --ref feature/\\"x\\"')
})

test('buildMarkdownReport includes status, gates, blockers, transforms and agents', () => {
  const markdown = buildMarkdownReport(manifest, {
    upstreamRef: 'main',
    options: { createPr: false, push: false },
    update: { branch: 'develop', commit: 'abc123' },
    gates: [{ name: 'governance', ok: true, governance: cleanGovernance }],
    evaluation: {
      ok: true,
      blockers: [],
      governance: cleanGovernance
    }
  })

  assert.match(markdown, /Status: \*\*PASS\*\*/)
  assert.match(markdown, /`governance`/)
  assert.match(markdown, /`praut-branding-files`/)
  assert.match(markdown, /`upstream-sync-agent`/)
})
