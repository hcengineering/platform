#!/usr/bin/env node

/**
 * Script to update specific @hcengineering packages to a specified version
 * across all package.json files in the workspace.
 *
 * Usage: node update-package-versions.js <version>
 * Example: node update-package-versions.js 0.7.2
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Packages to update
const PACKAGES_TO_UPDATE = [
  'account-client',
  'analytics',
  'analytics-service',
  'api-client',
  'client',
  'client-resources',
  'collaborator-client',
  'core',
  'hulylake-client',
  'model',
  'platform',
  'query',
  'rank',
  'retry',
  'rpc',
  'storage',
  'text',
  'text-core',
  'text-html',
  'text-markdown',
  'text-ydoc',
  'token'
]

// Convert to full package names
const FULL_PACKAGE_NAMES = PACKAGES_TO_UPDATE.map((pkg) => `@hcengineering/${pkg}`)

/**
 * Get the target version from command line arguments
 */
function getTargetVersion() {
  const version = process.argv[2]
  if (!version) {
    console.error('Error: Please provide a version number')
    console.error('Usage: node update-package-versions.js <version>')
    console.error('Example: node update-package-versions.js 0.7.2')
    process.exit(1)
  }

  // Add ^ prefix if not present
  return version.startsWith('^') ? version : `^${version}`
}

/**
 * Recursively find all package.json files in a directory
 */
function findPackageJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other common directories
      if (!['node_modules', '.git', 'dist', 'lib', 'build', '.rush', 'temp'].includes(file)) {
        findPackageJsonFiles(filePath, fileList)
      }
    } else if (file === 'package.json') {
      fileList.push(filePath)
    }
  }

  return fileList
}

/**
 * Update package.json file with new versions
 */
function updatePackageJson(filePath, targetVersion) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const packageJson = JSON.parse(content)
    let updated = false

    // Update in dependencies
    if (packageJson.dependencies) {
      for (const pkgName of FULL_PACKAGE_NAMES) {
        if (packageJson.dependencies[pkgName]) {
          const oldVersion = packageJson.dependencies[pkgName]
          packageJson.dependencies[pkgName] = targetVersion
          if (oldVersion !== targetVersion) {
            console.log(`  Updated ${pkgName}: ${oldVersion} -> ${targetVersion}`)
            updated = true
          }
        }
      }
    }

    // Update in devDependencies
    if (packageJson.devDependencies) {
      for (const pkgName of FULL_PACKAGE_NAMES) {
        if (packageJson.devDependencies[pkgName]) {
          const oldVersion = packageJson.devDependencies[pkgName]
          packageJson.devDependencies[pkgName] = targetVersion
          if (oldVersion !== targetVersion) {
            console.log(`  Updated ${pkgName} (dev): ${oldVersion} -> ${targetVersion}`)
            updated = true
          }
        }
      }
    }

    // Update in peerDependencies
    if (packageJson.peerDependencies) {
      for (const pkgName of FULL_PACKAGE_NAMES) {
        if (packageJson.peerDependencies[pkgName]) {
          const oldVersion = packageJson.peerDependencies[pkgName]
          packageJson.peerDependencies[pkgName] = targetVersion
          if (oldVersion !== targetVersion) {
            console.log(`  Updated ${pkgName} (peer): ${oldVersion} -> ${targetVersion}`)
            updated = true
          }
        }
      }
    }

    // Update in optionalDependencies
    if (packageJson.optionalDependencies) {
      for (const pkgName of FULL_PACKAGE_NAMES) {
        if (packageJson.optionalDependencies[pkgName]) {
          const oldVersion = packageJson.optionalDependencies[pkgName]
          packageJson.optionalDependencies[pkgName] = targetVersion
          if (oldVersion !== targetVersion) {
            console.log(`  Updated ${pkgName} (optional): ${oldVersion} -> ${targetVersion}`)
            updated = true
          }
        }
      }
    }

    // Write back to file if updated
    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8')
      return true
    }

    return false
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message)
    return false
  }
}

/**
 * Main function
 */
function main() {
  const targetVersion = getTargetVersion()
  const workspaceRoot = path.resolve(__dirname, '../..')

  console.log('='.repeat(80))
  console.log('Package Version Update Script')
  console.log('='.repeat(80))
  console.log(`Target version: ${targetVersion}`)
  console.log(`Workspace root: ${workspaceRoot}`)
  console.log(`Packages to update: ${PACKAGES_TO_UPDATE.length}`)
  console.log('='.repeat(80))
  console.log()

  // Find all package.json files
  console.log('Scanning for package.json files...')
  const packageJsonFiles = findPackageJsonFiles(workspaceRoot)
  console.log(`Found ${packageJsonFiles.length} package.json files`)
  console.log()

  // Update each file
  let updatedFiles = 0
  let totalUpdates = 0

  for (const filePath of packageJsonFiles) {
    const relativePath = path.relative(workspaceRoot, filePath)
    const wasUpdated = updatePackageJson(filePath, targetVersion)

    if (wasUpdated) {
      updatedFiles++
      console.log(`✓ ${relativePath}`)
    }
  }

  console.log()
  console.log('='.repeat(80))
  console.log('Summary')
  console.log('='.repeat(80))
  console.log(`Total package.json files scanned: ${packageJsonFiles.length}`)
  console.log(`Files updated: ${updatedFiles}`)
  console.log('='.repeat(80))

  if (updatedFiles > 0) {
    console.log()
    console.log('✓ Version update completed successfully!')
    console.log()
    console.log('Next steps:')
    console.log('1. Review the changes: git diff')
    console.log('2. Run: rush update')
    console.log('3. Run: rush rebuild')
  } else {
    console.log()
    console.log('No packages were updated.')
  }
  // Execute rush update if there were updates
  if (updatedFiles > 0) {
    console.log()
    console.log('Running rush update...')
    console.log('='.repeat(80))
    try {
      execSync('rush update', { stdio: 'inherit', cwd: workspaceRoot })
      console.log('='.repeat(80))
      console.log('✓ rush update completed successfully!')
    } catch (error) {
      console.error('Failed to run rush update:', error.message)
      process.exit(1)
    }
  }
}

// Run the script
main()
