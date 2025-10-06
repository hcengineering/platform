#!/usr/bin/env node

/**
 * Script to bump version of ALL Node.js packages by incrementing from previous tag
 * and update dependencies accordingly in a Rush.js monorepo
 *
 * Usage: node bump-changes-from-tag.js [git-revision] [major|minor|patch]
 * Example: node bump-changes-from-tag.js                # Auto-detect latest v*.*.* tag, patch bump
 * Example: node bump-changes-from-tag.js patch          # Auto-detect latest tag + patch bump
 * Example: node bump-changes-from-tag.js minor          # Auto-detect latest tag + minor bump
 * Example: node bump-changes-from-tag.js v0.7.0 major   # Use specific tag + major bump
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Colors for output
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m' // No Color
}

// Logging functions
function printInfo(message) {
  console.log(`${colors.BLUE}[INFO]${colors.NC} ${message}`)
}

function printSuccess(message) {
  console.log(`${colors.GREEN}[SUCCESS]${colors.NC} ${message}`)
}

function printWarning(message) {
  console.log(`${colors.YELLOW}[WARNING]${colors.NC} ${message}`)
}

function printError(message) {
  console.error(`${colors.RED}[ERROR]${colors.NC} ${message}`)
}

// Function to execute shell commands
function execCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim()
  } catch (error) {
    if (options.throwOnError !== false) {
      throw error
    }
    return null
  }
}

// Function to get the latest tag matching pattern v*.*.* (e.g., v0.7.x)
function getLatestVersionTag() {
  try {
    // Get all tags matching v*.*.* pattern
    const tags = execCommand("git tag -l 'v*.*.*'", { throwOnError: false })

    if (!tags) {
      printWarning('No version tags found matching v*.*.* pattern')
      return null
    }

    // Split tags, sort them, and pick the latest
    const tagList = tags.split('\n').filter((tag) => tag.trim())
    if (tagList.length === 0) {
      printWarning('No version tags found matching v*.*.* pattern')
      return null
    }

    // Sort version tags properly
    const sortedTags = tagList.sort((a, b) => {
      const versionA = a.replace('v', '').split('.').map(Number)
      const versionB = b.replace('v', '').split('.').map(Number)

      for (let i = 0; i < 3; i++) {
        if (versionA[i] !== versionB[i]) {
          return versionA[i] - versionB[i]
        }
      }
      return 0
    })

    return sortedTags[sortedTags.length - 1]
  } catch (error) {
    printWarning('Failed to get latest version tag')
    return null
  }
}

// Function to get version from tag (remove 'v' prefix if present)
function getTagVersion(tag) {
  return tag.startsWith('v') ? tag.substring(1) : tag
}

// Function to increment version based on bump type
function incrementVersion(version, bumpType) {
  // Remove any pre-release suffix first
  let baseVersion = version.split('-')[0]
  let suffix = ''
  if (version.includes('-')) {
    suffix = '-' + version.split('-').slice(1).join('-')
  }

  // Extract major.minor.patch
  const parts = baseVersion.split('.')
  let [major, minor, patch] = parts.map(Number)

  // Validate numeric components
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    printError(`Invalid version format: ${version}`)
    process.exit(1)
  }

  // Increment version based on bump type
  switch (bumpType) {
    case 'major':
      major++
      minor = 0
      patch = 0
      break
    case 'minor':
      minor++
      patch = 0
      break
    case 'patch':
      patch++
      break
    default:
      printError(`Invalid bump type: ${bumpType}`)
      process.exit(1)
  }

  return `${major}.${minor}.${patch}${suffix}`
}

// Function to get Rush projects from rush.json
function getRushProjects(rushJsonPath) {
  try {
    // Read and strip comments from JSON
    let content = fs.readFileSync(rushJsonPath, 'utf8')
    // Remove single line comments that start with //
    content = content.replace(/^\s*\/\/.*$/gm, '')
    // Remove multi-line comments /* ... */
    content = content.replace(/\/\*[\s\S]*?\*\//g, '')

    const rush = JSON.parse(content)

    if (!rush.projects || !Array.isArray(rush.projects)) {
      printError('No projects found in rush.json')
      return []
    }

    return rush.projects.map((project) => ({
      packageName: project.packageName,
      projectFolder: project.projectFolder,
      shouldPublish: project.shouldPublish || false
    }))
  } catch (error) {
    printError(`Error parsing rush.json: ${error.message}`)
    process.exit(1)
  }
}

// Function to update package.json version
function updatePackageVersion(packageFile, newVersion) {
  printInfo(`Updating version in ${packageFile} to ${newVersion}`)

  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
    pkg.version = newVersion
    fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n')
  } catch (error) {
    printError(`Error updating package.json: ${error.message}`)
    process.exit(1)
  }
}

// Function to update dependencies in package.json
function updateDependencies(packageFile, packageName, newVersion) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
    let updated = false

    // Helper function to update a dependency object
    const updateDepObject = (depObj, depType) => {
      if (depObj && depObj[packageName]) {
        const oldDep = depObj[packageName]
        if (oldDep.startsWith('workspace:')) {
          depObj[packageName] = `workspace:^${newVersion}`
        } else {
          depObj[packageName] = `^${newVersion}`
        }
        updated = true
      }
    }

    // Update in dependencies, devDependencies, and peerDependencies
    updateDepObject(pkg.dependencies, 'dependencies')
    updateDepObject(pkg.devDependencies, 'devDependencies')
    updateDepObject(pkg.peerDependencies, 'peerDependencies')

    if (updated) {
      fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n')
    }

    return updated
  } catch (error) {
    printError(`Error updating dependencies: ${error.message}`)
    return false
  }
}

// Main function
function main() {
  const args = process.argv.slice(2)
  let gitRevision
  let bumpType = 'patch'

  // Parse command line arguments
  if (args.length === 0) {
    // No arguments provided - auto-detect tag and use patch
    printInfo('No git revision provided, attempting to auto-detect latest version tag...')
    gitRevision = getLatestVersionTag()

    if (!gitRevision) {
      printError('Could not auto-detect latest version tag')
      printError('')
      printError('Usage: node bump-changes-from-tag.js [git-revision] [major|minor|patch]')
      printError(
        'Example: node bump-changes-from-tag.js                    # Auto-detect latest v*.*.* tag, patch bump'
      )
      printError('Example: node bump-changes-from-tag.js patch              # Auto-detect latest tag + patch bump')
      printError('Example: node bump-changes-from-tag.js minor              # Auto-detect latest tag + minor bump')
      printError('Example: node bump-changes-from-tag.js HEAD~5')
      printError('Example: node bump-changes-from-tag.js HEAD~5 minor')
      printError('Example: node bump-changes-from-tag.js v0.7.0 major')
      process.exit(1)
    }

    printSuccess(`Auto-detected latest version tag: ${gitRevision}`)
  } else if (args[0] === 'major' || args[0] === 'minor' || args[0] === 'patch') {
    // First argument is bump type - auto-detect tag
    printInfo(`Bump type '${args[0]}' provided, attempting to auto-detect latest version tag...`)
    gitRevision = getLatestVersionTag()

    if (!gitRevision) {
      printError('Could not auto-detect latest version tag')
      process.exit(1)
    }

    printSuccess(`Auto-detected latest version tag: ${gitRevision}`)
    bumpType = args[0]
  } else {
    // First argument is git revision
    gitRevision = args[0]
    bumpType = args[1] || 'patch'
  }

  // Validate bump type
  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    printError(`Invalid bump type: ${bumpType}`)
    printError('Valid options are: major, minor, patch')
    process.exit(1)
  }

  // Get repository root
  const repoRoot = execCommand('git rev-parse --show-toplevel')
  const rushJsonPath = path.join(repoRoot, 'rush.json')

  // Verify we're in a git repository
  if (!repoRoot) {
    printError('Not in a git repository')
    process.exit(1)
  }

  // Verify rush.json exists
  if (!fs.existsSync(rushJsonPath)) {
    printError(`rush.json not found at ${rushJsonPath}`)
    process.exit(1)
  }

  printInfo(`Repository root: ${repoRoot}`)
  printInfo(`Reference tag: ${gitRevision}`)
  printInfo(`Bump type: ${bumpType}`)

  // Get base version from tag and calculate new version
  const baseVersion = getTagVersion(gitRevision)
  const newVersion = incrementVersion(baseVersion, bumpType)

  printInfo(`Base version from tag: ${baseVersion}`)
  printSuccess(`New version for all packages: ${newVersion}`)

  // Get all Rush projects
  printInfo('Getting all Rush projects...')
  const projects = getRushProjects(rushJsonPath)
  printInfo(`Found ${projects.length} package(s) to update`)

  // Track updated packages
  const updatedPackages = []

  // Step 1: Update all package versions to the new version
  printInfo(`Updating all package versions to ${newVersion}...`)
  for (const project of projects) {
    const packageFile = path.join(repoRoot, project.projectFolder, 'package.json')

    if (fs.existsSync(packageFile)) {
      try {
        // Get current version
        const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
        const currentVersion = pkg.version

        updatePackageVersion(packageFile, newVersion)
        updatedPackages.push({
          packageName: project.packageName,
          newVersion: newVersion,
          projectFolder: project.projectFolder,
          shouldPublish: project.shouldPublish,
          oldVersion: currentVersion
        })
        printSuccess(`Updated ${project.packageName}: ${currentVersion} -> ${newVersion}`)
      } catch (error) {
        printError(`Error reading version from ${packageFile}`)
        process.exit(1)
      }
    } else {
      printWarning(`package.json not found for ${project.packageName} at ${packageFile}`)
    }
  }

  // Step 2: Update all internal dependencies to reference the new version
  printInfo(`Updating internal dependencies to version ${newVersion}...`)
  for (const project of projects) {
    const packageFile = path.join(repoRoot, project.projectFolder, 'package.json')

    if (fs.existsSync(packageFile)) {
      // Update dependencies for each package in the monorepo
      for (const depPackage of updatedPackages) {
        updateDependencies(packageFile, depPackage.packageName, newVersion)
      }
    }
  }

  printSuccess('Updated internal dependencies across all packages')
  printSuccess('Version bump complete!')

  // Summary
  console.log()
  printInfo('Summary of changes:')
  console.log(`  ${colors.BLUE}Base version (from tag ${gitRevision}):${colors.NC} ${baseVersion}`)
  console.log(`  ${colors.GREEN}New version (${bumpType} bump):${colors.NC} ${newVersion}`)
  console.log()
  printInfo('Updated packages:')

  for (const pkg of updatedPackages) {
    if (pkg.shouldPublish) {
      console.log(
        `  ${colors.GREEN}✓${colors.NC} ${pkg.packageName}: ${pkg.oldVersion} -> ${pkg.newVersion} ${colors.YELLOW}(will be published)${colors.NC}`
      )
    } else {
      console.log(
        `  ${colors.GREEN}✓${colors.NC} ${pkg.packageName}: ${pkg.oldVersion} -> ${pkg.newVersion} ${colors.BLUE}(private package)${colors.NC}`
      )
    }
  }

  console.log()
  printInfo('Next steps:')
  console.log('  1. Review the changes: git diff')
  console.log('  2. Update lockfile: rush update')
  console.log('  3. Run tests: rush test')
  console.log('  4. Build all packages: rush build')
  console.log(`  5. Commit changes: git add . && git commit -m 'Bump all versions to ${newVersion}'`)
  console.log(`  6. Tag the release: git tag v${newVersion} && git push origin v${newVersion}`)
  console.log('  7. For publishable packages, run: rush publish')

  // Run rush update to sync lockfile
  printInfo('Running rush update to sync lockfile...')
  try {
    execSync('rush update', { stdio: 'inherit', cwd: repoRoot })
    printSuccess('Done!')
  } catch (error) {
    printError('Failed to run rush update')
    process.exit(1)
  }
}

// Run the script
main()
