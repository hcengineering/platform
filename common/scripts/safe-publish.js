#!/usr/bin/env node

/**
 * Safe publish script that skips packages that are already published
 * Usage: node safe-publish.js [--include <package-name>]
 */

const { execSync, spawnSync } = require('child_process')
const https = require('https')
const http = require('http')

/**
 * Check if a package version exists on npm registry
 */
function checkPackageExists(packageName, version) {
  return new Promise((resolve) => {
    const registryUrl = process.env.NPM_REGISTRY || 'https://registry.npmjs.org'
    const url = `${registryUrl}/${encodeURIComponent(packageName)}/${version}`

    const client = url.startsWith('https:') ? https : http

    const req = client.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true) // Package version exists
      } else {
        resolve(false) // Package version doesn't exist
      }
    })

    req.on('error', () => {
      resolve(false) // Assume doesn't exist on error
    })

    req.setTimeout(5000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * Get list of packages that should be published from rush
 */
function getPublishablePackages(includePattern) {
  try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
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
      return []
    }
    const config = JSON.parse(lines.slice(jsonStart).join('\n'))

    return config.projects.filter((project) => {
      // Check if package should be published according to rush.json
      const shouldPublish = project.shouldPublish === true

      // Skip if no package name
      if (!project.name) {
        return false
      }

      // If includePattern is specified, filter by it
      if (includePattern && !project.name.includes(includePattern)) {
        return false
      }

      return shouldPublish && project.name.startsWith('@hcengineering')
    })
  } catch (err) {
    console.error('Error getting package list:', err.message)
    return []
  }
}

/**
 * Publish a single package
 */
function publishPackage(packagePath, packageName) {
  try {
    console.log(`Publishing ${packageName}...`)
    execSync('npm publish', {
      cwd: packagePath,
      stdio: 'inherit',
      encoding: 'utf-8'
    })
    console.log(`✓ Successfully published ${packageName}`)
    return true
  } catch (err) {
    console.error(`✗ Failed to publish ${packageName}:`, err.message)
    return false
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  let includePattern = null

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--include' && i + 1 < args.length) {
      includePattern = args[i + 1]
      i++
    }
  }

  console.log('Fetching publishable packages...')
  const packages = getPublishablePackages(includePattern)

  if (packages.length === 0) {
    console.log('No packages found to publish')
    return
  }

  console.log(`Found ${packages.length} package(s) to check`)
  console.log('='.repeat(80))

  let published = 0
  let skipped = 0
  let failed = 0

  for (const pkg of packages) {
    const packageName = pkg.name
    const version = pkg.version
    const packagePath = pkg.fullPath

    console.log(`\nChecking ${packageName}@${version}...`)

    const exists = await checkPackageExists(packageName, version)

    if (exists) {
      console.log(`⊘ Skipping ${packageName}@${version} (already published)`)
      skipped++
    } else {
      console.log(`→ ${packageName}@${version} not published, publishing now...`)
      const success = publishPackage(packagePath, packageName)
      if (success) {
        published++
      } else {
        failed++
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('Summary:')
  console.log(`  Published: ${published}`)
  console.log(`  Skipped:   ${skipped}`)
  console.log(`  Failed:    ${failed}`)
  console.log('='.repeat(80))

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
