#!/usr/bin/env node
/**
 * Per-package version increment: bump each @hcengineering package by one patch
 * and update dependency refs to the new versions.
 *
 * Usage: node bump-increment.js [--skip-foundations]
 *   --skip-foundations  do not increment packages under foundations/
 */

const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

const repo = '@hcengineering'
const packages = {}
const jsons = {}
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()

function fillPackages (config) {
  for (const project of config.projects) {
    const packageName = project.name ?? project.packageName
    if (typeof packageName !== 'string' || !packageName.startsWith(repo)) continue
    const projectPath = project.path ?? project.projectFolder ?? path.relative(repoRoot, project.fullPath ?? '')
    if (typeof projectPath !== 'string' || projectPath.length === 0) continue
    const fullProjectPath = path.resolve(repoRoot, projectPath)

    packages[packageName] = {
      version: project.version,
      path: fullProjectPath
    }

    const file = path.join(fullProjectPath, 'package.json')
    if (!fs.existsSync(file)) continue
    const raw = fs.readFileSync(file)
    jsons[packageName] = JSON.parse(raw)
  }
}

function parseVersion (v) {
  const parts = String(v).trim().replace(/^[^0-9]+/, '').split('.').map(n => parseInt(n, 10) || 0)
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
}

function compareVersions (a, b) {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (va.major !== vb.major) return va.major - vb.major
  if (va.minor !== vb.minor) return va.minor - vb.minor
  return va.patch - vb.patch
}

function incrementPatch (v) {
  const { major, minor, patch } = parseVersion(v)
  return `${major}.${minor}.${patch + 1}`
}

function isFoundations (pkgPath) {
  const relative = path.relative(repoRoot, pkgPath)
  return relative.startsWith('foundations' + path.sep) || relative === 'foundations'
}

function incrementEachPackage (skipFoundations) {
  const packageNames = Object.keys(packages)
  for (const packageName of packageNames) {
    if (skipFoundations && isFoundations(packages[packageName].path)) continue
    const json = jsons[packageName]
    if (json === undefined) continue
    const prev = json.version || '0.0.0'
    json.version = incrementPatch(prev)
  }
  for (const packageName of packageNames) {
    const json = jsons[packageName]
    if (json === undefined) continue
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    for (const depType of depTypes) {
      if (typeof json[depType] !== 'object') continue
      for (const [dependency, currentVersion] of Object.entries(json[depType])) {
        if (packages[dependency] === undefined) continue
        const depVersion = jsons[dependency] && jsons[dependency].version
        if (!depVersion) continue
        const useWorkspace = String(currentVersion).startsWith('workspace:')
        const newRef = useWorkspace ? `workspace:^${depVersion}` : `^${depVersion}`
        if (json[depType][dependency] !== newRef) {
          json[depType][dependency] = newRef
        }
      }
    }
  }
}

function main () {
  const skipFoundations = process.argv.includes('--skip-foundations')

  console.log('increment: bumping each package by one patch and syncing dependency refs ...')
  if (skipFoundations) {
    console.log('  (skipping packages under foundations/)')
  }

  const config = JSON.parse(execSync('rush list -p --json', { encoding: 'utf-8' }))
  fillPackages(config)

  const packageNames = Object.keys(packages)
  incrementEachPackage(skipFoundations)

  let maxVer = '0.0.0'
  for (const name of packageNames) {
    const v = jsons[name] && jsons[name].version
    if (v && compareVersions(v, maxVer) > 0) maxVer = v
  }

  for (const packageName of packageNames) {
    const pkg = packages[packageName]
    if (jsons[packageName] === undefined) continue
    const file = path.join(pkg.path, 'package.json')
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }

  console.log('... done')
}

main()
