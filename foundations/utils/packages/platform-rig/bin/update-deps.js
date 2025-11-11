#!/usr/bin/env node
//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Script to check and update @hcengineering/* dependencies across all Rush packages
//

const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

const SCOPE = '@hcengineering/'

/**
 * Get list of Rush projects using 'rush list --json'
 */
function getRushProjects() {
  try {
    const output = execSync('rush list --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const data = JSON.parse(output)

    // rush list --json returns { projects: [...] }
    const projects = data.projects || data

    if (!Array.isArray(projects)) {
      throw new Error('Expected rush list --json to return an array of projects')
    }

    return projects
  } catch (err) {
    if (err.message.includes('rush') || err.code === 'ENOENT') {
      throw new Error('Failed to run "rush list --json". Make sure you are in a Rush workspace and Rush is installed.')
    }
    throw new Error(`Failed to get Rush projects: ${err.message}`)
  }
}

/**
 * Get the workspace root from rush list output
 */
function getWorkspaceRoot(projects) {
  if (projects.length === 0) {
    return process.cwd()
  }

  // Use fullPath from rush list output
  const firstProject = projects[0]
  if (firstProject.fullPath && firstProject.path) {
    // Remove the relative path part from the full path to get workspace root
    return firstProject.fullPath.replace(new RegExp(firstProject.path + '$'), '')
  }

  // Fallback: find rush.json
  let currentDir = process.cwd()
  while (currentDir !== '/') {
    const rushJsonPath = path.join(currentDir, 'rush.json')
    if (fs.existsSync(rushJsonPath)) {
      return currentDir
    }
    currentDir = path.dirname(currentDir)
  }

  throw new Error('Could not determine workspace root')
}

/**
 * Get the latest version of a package from npm registry
 */
function getLatestVersion(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}/latest`

    https
      .get(url, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data)
              resolve(parsed.version)
            } catch (err) {
              reject(new Error(`Failed to parse response for ${packageName}: ${err.message}`))
            }
          } else if (res.statusCode === 404) {
            resolve(null) // Package not found in registry
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${packageName}`))
          }
        })
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

/**
 * Compare versions (simple semver comparison)
 */
function isNewerVersion(current, latest) {
  // Remove workspace: prefix and version operators
  current = current.replace(/^workspace:|[\^~><=]/g, '')

  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true
    if (latestParts[i] < currentParts[i]) return false
  }

  return false
}

/**
 * Check and update @hcengineering dependencies in a package.json
 */
async function updatePackageDependencies(project, latestVersions, dryRun = false) {
  // Use fullPath from rush list output
  const packageJsonPath = project.fullPath ? path.join(project.fullPath, 'package.json') : null

  if (!packageJsonPath || !fs.existsSync(packageJsonPath)) {
    return 0
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const packageName = packageJson.name
  let hasChanges = false
  const changes = []

  const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  for (const depType of dependencyTypes) {
    const deps = packageJson[depType]
    if (!deps) continue

    for (const [depName, currentVersion] of Object.entries(deps)) {
      if (!depName.startsWith(SCOPE)) continue

      // Skip workspace dependencies
      if (currentVersion.startsWith('workspace:')) {
        continue
      }

      const latestVersion = latestVersions[depName]

      if (!latestVersion) {
        console.log(`  ⚠️  ${depName}: not found in npm registry (current: ${currentVersion})`)
        continue
      }

      if (isNewerVersion(currentVersion, latestVersion)) {
        const prefix = currentVersion.match(/^[\^~]/)?.[0] || '^'
        const newVersion = `${prefix}${latestVersion}`

        changes.push({
          depType,
          depName,
          oldVersion: currentVersion,
          newVersion
        })

        if (!dryRun) {
          deps[depName] = newVersion
          hasChanges = true
        }
      }
    }
  }

  if (changes.length > 0) {
    console.log(`\n📦 ${packageName}`)
    for (const change of changes) {
      console.log(`  ✓ ${change.depName}: ${change.oldVersion} → ${change.newVersion} (${change.depType})`)
    }

    if (!dryRun && hasChanges) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')
    }
  }

  return changes.length
}

/**
 * Get all @hcengineering packages and their latest versions
 */
async function fetchLatestVersions(projects) {
  const packageNames = new Set()

  // Collect all @hcengineering package names from all projects
  for (const project of projects) {
    const packageJsonPath = project.fullPath ? path.join(project.fullPath, 'package.json') : null
    if (!packageJsonPath || !fs.existsSync(packageJsonPath)) continue

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

    for (const depType of dependencyTypes) {
      const deps = packageJson[depType]
      if (!deps) continue

      for (const depName of Object.keys(deps)) {
        if (depName.startsWith(SCOPE)) {
          packageNames.add(depName)
        }
      }
    }
  }

  console.log(`\n🔍 Checking latest versions for ${packageNames.size} @hcengineering packages...\n`)

  const latestVersions = {}
  const promises = Array.from(packageNames).map(async (packageName) => {
    try {
      const version = await getLatestVersion(packageName)
      if (version) {
        latestVersions[packageName] = version
        console.log(`  ✓ ${packageName}@${version}`)
      } else {
        console.log(`  ⚠️  ${packageName}: not found in registry`)
      }
    } catch (err) {
      console.error(`  ✗ ${packageName}: ${err.message}`)
    }
  })

  await Promise.all(promises)

  return latestVersions
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Rush @hcengineering Dependencies Updater

Usage:
  update-hcengineering-deps [options]

Options:
  --dry-run, -n    Check for updates without modifying files
  --help, -h       Show this help message

Description:
  This script checks all Rush packages for @hcengineering/* dependencies
  and updates them to the latest versions available in npm registry.

  Workspace dependencies (using 'workspace:' protocol) are never modified.

Examples:
  # Check for updates (dry run)
  update-hcengineering-deps --dry-run

  # Apply updates
  update-hcengineering-deps

After updating:
  1. Run 'rush update' to update lockfiles
  2. Run 'rush build' to verify builds
  3. Test your changes
`)
    return
  }

  const dryRun = args.includes('--dry-run') || args.includes('-n')

  console.log('🚀 Rush @hcengineering Dependencies Updater\n')

  // Get Rush projects using 'rush list --json'
  const projects = getRushProjects()
  const workspaceRoot = getWorkspaceRoot(projects)

  console.log(`Workspace: ${workspaceRoot}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'UPDATE'}`)
  console.log(`Found ${projects.length} projects`)

  // Fetch latest versions from npm
  const latestVersions = await fetchLatestVersions(projects)

  if (Object.keys(latestVersions).length === 0) {
    console.log('\n⚠️  No @hcengineering packages found in npm registry')
    return
  }

  console.log('\n' + '='.repeat(80))
  console.log('Checking for updates...')
  console.log('='.repeat(80))

  // Update each project's dependencies
  let totalUpdates = 0
  for (const project of projects) {
    const updates = await updatePackageDependencies(project, latestVersions, dryRun)
    totalUpdates += updates
  }

  console.log('\n' + '='.repeat(80))

  if (totalUpdates === 0) {
    console.log('✅ All @hcengineering dependencies are up to date!')
  } else {
    if (dryRun) {
      console.log(`\n📊 Found ${totalUpdates} potential update(s)`)
      console.log('\nRun without --dry-run flag to apply changes')
    } else {
      console.log(`\n✅ Updated ${totalUpdates} dependency version(s)`)
      console.log('\n💡 Next steps:')
      console.log('   1. Run: rush update')
      console.log('   2. Run: rush build')
      console.log('   3. Test your changes')
    }
  }
}

// Run the script
main().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
