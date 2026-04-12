#!/usr/bin/env node

/**
 * Run npm pkg fix on all @hcengineering packages in the monorepo.
 * Usage: node common/scripts/fix-packages.js
 */

const path = require('path')
const execSync = require('child_process').execSync

const repo = '@hcengineering'
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()

function main () {
  const output = execSync('node common/scripts/install-run-rush.js list -p --json', {
    encoding: 'utf-8',
    cwd: repoRoot
  })
  const lines = output.split('\n')
  let jsonStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('{')) {
      jsonStart = i
      break
    }
  }
  if (jsonStart === -1) {
    console.error('Could not find JSON output from rush list')
    process.exit(1)
  }
  const config = JSON.parse(lines.slice(jsonStart).join('\n'))

  const packages = []
  for (const project of config.projects) {
    const packageName = project.name ?? project.packageName
    if (typeof packageName !== 'string' || !packageName.startsWith(repo)) continue
    const projectPath = project.path ?? project.projectFolder ?? path.relative(repoRoot, project.fullPath ?? '')
    if (typeof projectPath !== 'string' || projectPath.length === 0) continue
    packages.push({
      name: packageName,
      path: path.resolve(repoRoot, projectPath)
    })
  }

  console.log('Fixing package.json in all @hcengineering packages...')
  for (const pkg of packages) {
    try {
      console.log('fixing', pkg.name)
      execSync('npm pkg fix', { encoding: 'utf-8', cwd: pkg.path, stdio: 'pipe' })
    } catch (err) {
      console.error('Failed:', pkg.name, err.message)
    }
  }
  console.log('... done')
}

main()
