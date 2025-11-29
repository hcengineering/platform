#!/usr/bin/env node

/**
 * Comprehensive benchmark and comparison script for Rush builds
 *
 * Compares:
 * - rush build / rush validate (with and without Rush cache)
 * - rush fast-build / rush fast-build:validate (with and without our cache)
 *
 * Also verifies that outputs are identical between rush build and fast-build
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'build-comparison')
const DIFFS_DIR = path.join(OUTPUT_DIR, 'diffs')

const RUSH_BUILD_LIB = path.join(OUTPUT_DIR, 'rush-build-lib')
const RUSH_VALIDATE_TYPES = path.join(OUTPUT_DIR, 'rush-validate-types')
const FAST_BUILD_LIB = path.join(OUTPUT_DIR, 'fast-build-lib')
const FAST_VALIDATE_TYPES = path.join(OUTPUT_DIR, 'fast-validate-types')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
}

function log(level, message) {
  const prefixes = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    benchmark: `${colors.magenta}[BENCHMARK]${colors.reset}`
  }
  console.log(`${prefixes[level]} ${message}`)
}

/**
 * Get list of all packages from rush list --json
 */
function getPackages() {
  const output = execSync('rush list --json', { cwd: ROOT_DIR, encoding: 'utf-8' })
  const jsonStart = output.indexOf('{')
  const jsonStr = output.slice(jsonStart)
  const data = JSON.parse(jsonStr)
  return data.projects
}

/**
 * Recursively remove a directory
 */
function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Recursively create directory
 */
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dir, baseDir = dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir))
    } else {
      files.push({
        relativePath: path.relative(baseDir, fullPath),
        fullPath
      })
    }
  }
  return files
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0

  mkdirp(dest)
  let count = 0
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      count++
    }
  }
  return count
}

/**
 * Calculate MD5 hash of a file
 */
function fileHash(filePath) {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Clean lib, types, and .validate folders in all packages
 */
function cleanBuildOutputs(packages) {
  log('info', 'Cleaning lib/, types/, and .validate/ folders in all packages...')

  let libCount = 0
  let typesCount = 0
  let validateCount = 0

  for (const pkg of packages) {
    const libPath = path.join(pkg.fullPath, 'lib')
    const typesPath = path.join(pkg.fullPath, 'types')
    const validatePath = path.join(pkg.fullPath, '.validate')

    if (fs.existsSync(libPath)) {
      rmrf(libPath)
      libCount++
    }
    if (fs.existsSync(typesPath)) {
      rmrf(typesPath)
      typesCount++
    }
    if (fs.existsSync(validatePath)) {
      rmrf(validatePath)
      validateCount++
    }
  }

  log('info', `Cleaned ${libCount} lib/, ${typesCount} types/, ${validateCount} .validate/ directories`)
}

/**
 * Clean Rush build cache
 * Note: We only remove common/temp/build-cache, NOT .rush folders in packages
 * because .rush/temp/shrinkwrap-deps.json is needed by Rush for dependency analysis
 */
function cleanRushCache() {
  log('info', 'Cleaning Rush build cache...')

  // Clean common/temp/build-cache if exists
  const buildCachePath = path.join(ROOT_DIR, 'common', 'temp', 'build-cache')
  if (fs.existsSync(buildCachePath)) {
    const fileCount = fs.readdirSync(buildCachePath).length
    log('info', `Found ${fileCount} cache entries in ${buildCachePath}`)
    rmrf(buildCachePath)
    log('success', `Removed common/temp/build-cache (${fileCount} entries)`)
  } else {
    log('info', 'No build cache to clean')
  }
}

/**
 * Sanitize package name for directory
 */
function sanitizeName(name) {
  return name.replace(/@/g, '').replace(/\//g, '__')
}

/**
 * Collect lib files from all packages
 */
function collectLibFiles(packages, outputDir) {
  log('info', `Collecting lib/ files to ${outputDir}...`)

  rmrf(outputDir)
  mkdirp(outputDir)

  let pkgCount = 0
  let fileCount = 0

  for (const pkg of packages) {
    const libPath = path.join(pkg.fullPath, 'lib')
    if (fs.existsSync(libPath)) {
      const safeName = sanitizeName(pkg.name)
      const destDir = path.join(outputDir, safeName, 'lib')

      const copied = copyDir(libPath, destDir)
      fileCount += copied
      pkgCount++
    }
  }

  log('success', `Collected ${fileCount} files from ${pkgCount} packages`)
  return { pkgCount, fileCount }
}

/**
 * Collect types files from all packages
 */
function collectTypesFiles(packages, outputDir) {
  log('info', `Collecting types/ files to ${outputDir}...`)

  rmrf(outputDir)
  mkdirp(outputDir)

  let pkgCount = 0
  let fileCount = 0

  for (const pkg of packages) {
    const typesPath = path.join(pkg.fullPath, 'types')
    if (fs.existsSync(typesPath)) {
      const safeName = sanitizeName(pkg.name)
      const destDir = path.join(outputDir, safeName, 'types')

      const copied = copyDir(typesPath, destDir)
      fileCount += copied
      pkgCount++
    }
  }

  log('success', `Collected ${fileCount} files from ${pkgCount} packages`)
  return { pkgCount, fileCount }
}

/**
 * Compare two directories and return differences
 */
/**
 * Remove empty directories recursively (bottom-up)
 */
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return

  let entries = fs.readdirSync(dir, { withFileTypes: true })

  // First, recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name))
    }
  }

  // Re-read after removing subdirs
  entries = fs.readdirSync(dir)
  if (entries.length === 0) {
    fs.rmdirSync(dir)
  }
}

/**
 * Save different files to the diffs directory for inspection
 */
function saveDifferentFiles(relPath, file1Path, file2Path, label1, label2, diffBaseDir) {
  const diffDir1 = path.join(diffBaseDir, label1, path.dirname(relPath))
  const diffDir2 = path.join(diffBaseDir, label2, path.dirname(relPath))

  mkdirp(diffDir1)
  mkdirp(diffDir2)

  const fileName = path.basename(relPath)

  if (fs.existsSync(file1Path)) {
    fs.copyFileSync(file1Path, path.join(diffDir1, fileName))
  }
  if (fs.existsSync(file2Path)) {
    fs.copyFileSync(file2Path, path.join(diffDir2, fileName))
  }
}

function compareDirectories(dir1, dir2, label1, label2) {
  log('info', `Comparing ${label1} vs ${label2}...`)

  if (!fs.existsSync(dir1)) {
    log('error', `${label1} directory does not exist: ${dir1}`)
    return { match: false, error: 'dir1 missing' }
  }

  if (!fs.existsSync(dir2)) {
    log('error', `${label2} directory does not exist: ${dir2}`)
    return { match: false, error: 'dir2 missing' }
  }

  const files1 = getAllFiles(dir1)
  const files2 = getAllFiles(dir2)

  const map1 = new Map(files1.map(f => [f.relativePath, f.fullPath]))
  const map2 = new Map(files2.map(f => [f.relativePath, f.fullPath]))

  const onlyIn1 = []
  const onlyIn2 = []
  const different = []
  const identical = []

  // Create diff directory for this comparison
  const comparisonName = `${label1}-vs-${label2}`
  const diffBaseDir = path.join(DIFFS_DIR, comparisonName)

  // Clean previous diffs for this comparison
  rmrf(diffBaseDir)

  // Check files in dir1
  for (const [relPath, fullPath] of map1) {
    if (!map2.has(relPath)) {
      onlyIn1.push(relPath)
      // Save file that only exists in dir1
      saveDifferentFiles(relPath, fullPath, '', label1, label2, diffBaseDir)
    } else {
      const hash1 = fileHash(fullPath)
      const hash2 = fileHash(map2.get(relPath))
      if (hash1 !== hash2) {
        different.push(relPath)
        // Save both versions of different files
        saveDifferentFiles(relPath, fullPath, map2.get(relPath), label1, label2, diffBaseDir)
      } else {
        identical.push(relPath)
        // Remove identical files from the collected directories to save space
        // (keep only files that differ or are unique)
      }
    }
  }

  // Check files only in dir2
  for (const [relPath, fullPath] of map2) {
    if (!map1.has(relPath)) {
      onlyIn2.push(relPath)
      // Save file that only exists in dir2
      saveDifferentFiles(relPath, '', fullPath, label1, label2, diffBaseDir)
    }
  }

  // Remove identical files from the source directories (keep only differences)
  for (const relPath of identical) {
    const file1 = path.join(dir1, relPath)
    const file2 = path.join(dir2, relPath)
    try {
      if (fs.existsSync(file1)) fs.unlinkSync(file1)
      if (fs.existsSync(file2)) fs.unlinkSync(file2)
    } catch (e) {
      // Ignore errors during cleanup
    }
  }

  // Clean up empty directories after removing identical files
  removeEmptyDirs(dir1)
  removeEmptyDirs(dir2)

  console.log(`  ${label1}: ${files1.length} files`)
  console.log(`  ${label2}: ${files2.length} files`)
  console.log(`  Identical: ${identical.length}`)
  console.log(`  Files only in ${label1}: ${onlyIn1.length}`)
  console.log(`  Files only in ${label2}: ${onlyIn2.length}`)
  console.log(`  Files that differ: ${different.length}`)

  const match = onlyIn1.length === 0 && onlyIn2.length === 0 && different.length === 0

  if (match) {
    log('success', '✓ Directories are identical!')
  } else {
    log('warning', '✗ Directories differ')

    if (onlyIn1.length > 0) {
      console.log(`\n  First 10 files only in ${label1}:`)
      onlyIn1.slice(0, 10).forEach(f => console.log(`    - ${f}`))
    }

    if (onlyIn2.length > 0) {
      console.log(`\n  First 10 files only in ${label2}:`)
      onlyIn2.slice(0, 10).forEach(f => console.log(`    - ${f}`))
    }

    if (different.length > 0) {
      console.log(`\n  First 10 different files:`)
      different.slice(0, 10).forEach(f => console.log(`    - ${f}`))
      console.log(`\n  Different files saved to: ${diffBaseDir}`)
    }
  }

  return {
    match,
    stats: {
      files1: files1.length,
      files2: files2.length,
      identical: identical.length,
      onlyIn1: onlyIn1.length,
      onlyIn2: onlyIn2.length,
      different: different.length
    },
    onlyIn1,
    onlyIn2,
    different,
    diffDir: diffBaseDir
  }
}

/**
 * Run a command and return timing info
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const { continueOnError = false, silent = false } = options
    const startTime = Date.now()

    if (!silent) {
      log('info', `Running: ${command} ${args.join(' ')}`)
    }

    const proc = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: silent ? 'pipe' : 'inherit',
      shell: true
    })

    proc.on('close', (code) => {
      const duration = (Date.now() - startTime) / 1000
      if (code === 0) {
        if (!silent) {
          log('success', `Completed in ${duration.toFixed(1)}s`)
        }
        resolve({ success: true, duration })
      } else {
        if (!silent) {
          log('error', `Failed with code ${code}`)
        }
        if (continueOnError) {
          resolve({ success: false, duration, code })
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}`))
        }
      }
    })

    proc.on('error', (err) => {
      if (continueOnError) {
        resolve({ success: false, error: err.message })
      } else {
        reject(err)
      }
    })
  })
}

/**
 * Check if Rush build cache is enabled
 */
function isRushCacheEnabled() {
  try {
    const buildCacheConfigPath = path.join(ROOT_DIR, 'common', 'config', 'rush', 'build-cache.json')
    if (fs.existsSync(buildCacheConfigPath)) {
      const config = JSON.parse(fs.readFileSync(buildCacheConfigPath, 'utf-8'))
      return config.buildCacheEnabled === true
    }
  } catch {
    // Ignore errors
  }
  return false
}

/**
 * Print a section header
 */
function printSection(title, step = null) {
  console.log('')
  console.log('========================================')
  if (step) {
    console.log(`  Step ${step}: ${title}`)
  } else {
    console.log(`  ${title}`)
  }
  console.log('========================================')
}

/**
 * Format duration for display
 */
function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-'
  return `${seconds.toFixed(1)}s`
}

/**
 * Format speedup for display
 */
function formatSpeedup(baseline, comparison) {
  if (!baseline || !comparison) return '-'
  const speedup = baseline / comparison
  if (speedup >= 1) {
    return `${colors.green}${speedup.toFixed(1)}x faster${colors.reset}`
  } else {
    return `${colors.red}${(1/speedup).toFixed(1)}x slower${colors.reset}`
  }
}

/**
 * Calculate speedup (plain, for markdown)
 */
function calcSpeedup(baseline, comparison) {
  if (!baseline || !comparison) return null
  return baseline / comparison
}

/**
 * Print benchmark results table
 */
function printBenchmarkTable(results) {
  console.log('')
  console.log(`${colors.bold}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bold}║                         BENCHMARK RESULTS                                  ║${colors.reset}`)
  console.log(`${colors.bold}╠════════════════════════════════════════════════════════════════════════════╣${colors.reset}`)

  // Rush build results
  console.log(`${colors.bold}║ Rush Build                                                                 ║${colors.reset}`)
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`║  rush build (cold, no cache)        ${padRight(formatDuration(results.rushBuildCold), 38)}║`)
  console.log(`║  rush build (warm, with cache)      ${padRight(formatDuration(results.rushBuildWarm), 38)}║`)
  console.log(`║  rush validate (cold)               ${padRight(formatDuration(results.rushValidateCold), 38)}║`)
  console.log(`║  rush validate (warm, with cache)   ${padRight(formatDuration(results.rushValidateWarm), 38)}║`)

  // Fast build results
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`${colors.bold}║ Fast Build                                                                 ║${colors.reset}`)
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`║  fast-build (cold)                  ${padRight(formatDuration(results.fastBuildCold), 38)}║`)
  console.log(`║  fast-build:validate (cold)         ${padRight(formatDuration(results.fastValidateCold), 38)}║`)
  console.log(`║  fast-build:validate (warm)         ${padRight(formatDuration(results.fastValidateWarm), 38)}║`)

  // Comparison
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`${colors.bold}║ Comparison (Cold builds)                                                   ║${colors.reset}`)
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)

  const buildSpeedup = formatSpeedup(results.rushBuildCold, results.fastBuildCold)
  const validateSpeedup = formatSpeedup(results.rushValidateCold, results.fastValidateCold)
  const totalRushCold = (results.rushBuildCold || 0) + (results.rushValidateCold || 0)
  const totalFastCold = (results.fastBuildCold || 0) + (results.fastValidateCold || 0)
  const totalSpeedup = formatSpeedup(totalRushCold, totalFastCold)

  console.log(`║  Build:     rush ${padRight(formatDuration(results.rushBuildCold), 8)} vs fast ${padRight(formatDuration(results.fastBuildCold), 8)} ${padRight(buildSpeedup, 20)}║`)
  console.log(`║  Validate:  rush ${padRight(formatDuration(results.rushValidateCold), 8)} vs fast ${padRight(formatDuration(results.fastValidateCold), 8)} ${padRight(validateSpeedup, 20)}║`)
  console.log(`║  Total:     rush ${padRight(formatDuration(totalRushCold), 8)} vs fast ${padRight(formatDuration(totalFastCold), 8)} ${padRight(totalSpeedup, 20)}║`)

  // Warm comparison
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`${colors.bold}║ Comparison (Warm/Cached builds)                                            ║${colors.reset}`)
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)

  const warmBuildSpeedup = formatSpeedup(results.rushBuildWarm, results.fastBuildCold)
  const warmValidateSpeedup = formatSpeedup(results.rushValidateWarm, results.fastValidateWarm)

  console.log(`║  Build:     rush ${padRight(formatDuration(results.rushBuildWarm), 8)} vs fast ${padRight(formatDuration(results.fastBuildCold), 8)} ${padRight(warmBuildSpeedup, 20)}║`)
  console.log(`║  Validate:  rush ${padRight(formatDuration(results.rushValidateWarm), 8)} vs fast ${padRight(formatDuration(results.fastValidateWarm), 8)} ${padRight(warmValidateSpeedup, 20)}║`)

  // Output comparison
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)
  console.log(`${colors.bold}║ Output Verification                                                        ║${colors.reset}`)
  console.log(`${colors.bold}╟────────────────────────────────────────────────────────────────────────────╢${colors.reset}`)

  const libStatus = results.libMatch ? `${colors.green}✓ IDENTICAL${colors.reset}` : `${colors.red}✗ DIFFER${colors.reset}`
  const typesStatus = results.typesMatch ? `${colors.green}✓ IDENTICAL${colors.reset}` : `${colors.red}✗ DIFFER${colors.reset}`

  console.log(`║  lib/ files:   ${padRight(libStatus, 58)}║`)
  console.log(`║  types/ files: ${padRight(typesStatus, 58)}║`)

  console.log(`${colors.bold}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}`)
}

/**
 * Pad string to the right
 */
function padRight(str, len) {
  // Strip ANSI codes for length calculation
  const plainStr = str.replace(/\x1b\[[0-9;]*m/g, '')
  const padding = Math.max(0, len - plainStr.length)
  return str + ' '.repeat(padding)
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(results, toPackage) {
  const timestamp = new Date().toISOString()
  const target = toPackage || 'all packages'

  // Calculate speedups
  const buildColdSpeedup = calcSpeedup(results.rushBuildCold, results.fastBuildCold)
  const validateColdSpeedup = calcSpeedup(results.rushValidateCold, results.fastValidateCold)
  const totalRushCold = (results.rushBuildCold || 0) + (results.rushValidateCold || 0)
  const totalFastCold = (results.fastBuildCold || 0) + (results.fastValidateCold || 0)
  const totalColdSpeedup = calcSpeedup(totalRushCold, totalFastCold)
  const warmValidateSpeedup = calcSpeedup(results.rushValidateWarm, results.fastValidateWarm)

  const formatNum = (n) => n !== null && n !== undefined ? n.toFixed(1) : '-'
  const formatSpeedupMd = (s) => s !== null ? `**${s.toFixed(1)}x**` : '-'

  let md = `# Rush Build Benchmark Report

**Generated:** ${timestamp}
**Target:** ${target}

## Summary

| Metric | Rush | Fast-build | Speedup |
|--------|------|------------|---------|
| Build (cold) | ${formatNum(results.rushBuildCold)}s | ${formatNum(results.fastBuildCold)}s | ${formatSpeedupMd(buildColdSpeedup)} |
| Build (warm) | ${formatNum(results.rushBuildWarm)}s | ${formatNum(results.fastBuildCold)}s | ${formatSpeedupMd(calcSpeedup(results.rushBuildWarm, results.fastBuildCold))} |
| Validate (cold) | ${formatNum(results.rushValidateCold)}s | ${formatNum(results.fastValidateCold)}s | ${formatSpeedupMd(validateColdSpeedup)} |
| Validate (warm) | ${formatNum(results.rushValidateWarm)}s | ${formatNum(results.fastValidateWarm)}s | ${formatSpeedupMd(warmValidateSpeedup)} |
| **Total (cold)** | ${formatNum(totalRushCold)}s | ${formatNum(totalFastCold)}s | ${formatSpeedupMd(totalColdSpeedup)} |

## Detailed Timings

### Rush Build

| Phase | Cold (no cache) | Warm (with cache) |
|-------|-----------------|-------------------|
| build | ${formatNum(results.rushBuildCold)}s | ${formatNum(results.rushBuildWarm)}s |
| validate | ${formatNum(results.rushValidateCold)}s | ${formatNum(results.rushValidateWarm)}s |

### Fast Build

| Phase | Cold (--no-cache) | Warm (cached) |
|-------|-------------------|---------------|
| fast-build | ${formatNum(results.fastBuildCold)}s | - |
| fast-build:validate | ${formatNum(results.fastValidateCold)}s | ${formatNum(results.fastValidateWarm)}s |

## Output Verification

| Output | Status | Files |
|--------|--------|-------|
| lib/ | ${results.libMatch ? '✅ IDENTICAL' : '❌ DIFFER'} | ${results.libStats ? results.libStats.files1 : '-'} |
| types/ | ${results.typesMatch ? '✅ IDENTICAL' : '❌ DIFFER'} | ${results.typesStats ? results.typesStats.files1 : '-'} |

`

  if (!results.libMatch && results.libStats) {
    md += `### lib/ Differences

- Files only in rush-build: ${results.libStats.onlyIn1}
- Files only in fast-build: ${results.libStats.onlyIn2}
- Files that differ: ${results.libStats.different}
- **Different files saved to:** \`build-comparison/diffs/rush-build-vs-fast-build/\`

`
  }

  if (!results.typesMatch && results.typesStats) {
    md += `### types/ Differences

- Files only in rush-validate: ${results.typesStats.onlyIn1}
- Files only in fast-validate: ${results.typesStats.onlyIn2}
- Files that differ: ${results.typesStats.different}
- **Different files saved to:** \`build-comparison/diffs/rush-validate-vs-fast-validate/\`

`
  }

  md += `## Conclusion

`
  if (results.libMatch && results.typesMatch) {
    md += `✅ **All outputs match!** fast-build produces identical results to rush build.\n`
  } else {
    md += `❌ **Outputs differ.** See details above.\n`
  }

  if (totalColdSpeedup && totalColdSpeedup > 1) {
    md += `\n🚀 **fast-build is ${totalColdSpeedup.toFixed(1)}x faster** than rush build (cold builds).\n`
  }

  if (warmValidateSpeedup && warmValidateSpeedup > 1) {
    md += `\n⚡ **fast-build:validate (warm) is ${warmValidateSpeedup.toFixed(1)}x faster** than rush validate (warm).\n`
  }

  return md
}

/**
 * Write detailed report to file (JSON and Markdown)
 */
function writeReport(outputDir, results, toPackage) {
  // Write JSON report
  const jsonReportPath = path.join(outputDir, 'benchmark-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    targetPackage: toPackage || 'all',
    timings: {
      rushBuildCold: results.rushBuildCold,
      rushBuildWarm: results.rushBuildWarm,
      rushValidateCold: results.rushValidateCold,
      rushValidateWarm: results.rushValidateWarm,
      fastBuildCold: results.fastBuildCold,
      fastValidateCold: results.fastValidateCold,
      fastValidateWarm: results.fastValidateWarm
    },
    comparison: {
      libMatch: results.libMatch,
      typesMatch: results.typesMatch,
      libStats: results.libStats,
      typesStats: results.typesStats
    }
  }
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2))

  // Write Markdown report
  const mdReportPath = path.join(outputDir, 'benchmark-report.md')
  const md = generateMarkdownReport(results, toPackage)
  fs.writeFileSync(mdReportPath, md)

  log('info', `Reports written to:`)
  log('info', `  - ${jsonReportPath}`)
  log('info', `  - ${mdReportPath}`)
}

/**
 * Print usage
 */
function printUsage() {
  console.log(`
Usage: node compare-builds.js [options]

Comprehensive benchmark comparing rush build/validate with fast-build

Options:
  --help, -h            Show this help message
  --skip-rush           Skip rush build/validate benchmarks
  --skip-fast           Skip fast-build benchmarks
  --compare-only        Only run output comparison (requires previous runs)
  --to <package>        Only test specific package and its dependencies
  --continue-on-error   Continue even if commands fail

Benchmark steps:
  1. Clean all outputs and Rush cache
  2. Run rush build (cold) - measure time
  3. Run rush build (warm) - measure with Rush cache
  4. Run rush validate (cold) - measure time
  5. Run rush validate (warm) - measure with Rush cache
  6. Clean all outputs and Rush cache
  7. Run rush fast-build (cold) - measure time
  8. Run rush fast-build:validate (cold, --no-cache) - measure time
  9. Run rush fast-build:validate (warm) - measure with our cache
  10. Compare outputs between rush and fast-build
  11. Print benchmark summary table
`)
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = {
    help: false,
    skipRush: false,
    skipFast: false,
    compareOnly: false,
    toPackage: null,
    continueOnError: false
  }

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true
        break
      case '--skip-rush':
        args.skipRush = true
        break
      case '--skip-fast':
        args.skipFast = true
        break
      case '--compare-only':
        args.compareOnly = true
        break
      case '--to':
        args.toPackage = process.argv[++i]
        break
      case '--continue-on-error':
        args.continueOnError = true
        break
      default:
        log('error', `Unknown option: ${arg}`)
        process.exit(1)
    }
  }

  return args
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs()

  if (args.help) {
    printUsage()
    process.exit(0)
  }

  console.log('')
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}║          Rush Build Benchmark & Comparison Script              ║${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`)
  console.log('')

  const packages = getPackages()
  log('info', `Found ${packages.length} packages`)

  // Check Rush cache status
  const rushCacheEnabled = isRushCacheEnabled()
  if (rushCacheEnabled) {
    log('info', 'Rush build cache is enabled in config')
  } else {
    log('warning', 'Rush build cache is NOT enabled in config')
  }

  // Clean and recreate output directory
  rmrf(OUTPUT_DIR)
  mkdirp(OUTPUT_DIR)

  const results = {
    rushBuildCold: null,
    rushBuildWarm: null,
    rushValidateCold: null,
    rushValidateWarm: null,
    fastBuildCold: null,
    fastValidateCold: null,
    fastValidateWarm: null,
    libMatch: false,
    typesMatch: false,
    libStats: null,
    typesStats: null
  }

  const toArg = args.toPackage ? ['--to', args.toPackage] : []

  if (!args.compareOnly) {
    // ========================================
    // Rush Build Benchmarks
    // ========================================
    if (!args.skipRush) {
      printSection('Clean all outputs and Rush cache', 1)
      cleanBuildOutputs(packages)
      cleanRushCache()

      printSection('rush build (cold)', 2)
      const rushBuildColdResult = await runCommand('rush', ['build', ...toArg])
      results.rushBuildCold = rushBuildColdResult.duration
      log('benchmark', `rush build (cold): ${formatDuration(results.rushBuildCold)}`)

      printSection('rush build (warm, with cache)', '2.1')
      const rushBuildWarmResult = await runCommand('rush', ['build', ...toArg])
      results.rushBuildWarm = rushBuildWarmResult.duration
      log('benchmark', `rush build (warm): ${formatDuration(results.rushBuildWarm)}`)

      // Collect lib files from rush build
      collectLibFiles(packages, RUSH_BUILD_LIB)

      printSection('rush validate (cold)', 3)
      const rushValidateColdResult = await runCommand('rush', ['validate', ...toArg])
      results.rushValidateCold = rushValidateColdResult.duration
      log('benchmark', `rush validate (cold): ${formatDuration(results.rushValidateCold)}`)

      printSection('rush validate (warm, with cache)', '3.1')
      const rushValidateWarmResult = await runCommand('rush', ['validate', ...toArg])
      results.rushValidateWarm = rushValidateWarmResult.duration
      log('benchmark', `rush validate (warm): ${formatDuration(results.rushValidateWarm)}`)

      // Collect types files from rush validate
      collectTypesFiles(packages, RUSH_VALIDATE_TYPES)
    }

    // ========================================
    // Fast Build Benchmarks
    // ========================================
    if (!args.skipFast) {
      printSection('Clean for fast-build test', 4)
      cleanBuildOutputs(packages)
      cleanRushCache()

      printSection('rush fast-build (cold)', 5)
      const fastBuildArgs = ['fast-build', ...toArg]
      const fastBuildResult = await runCommand('rush', fastBuildArgs)
      results.fastBuildCold = fastBuildResult.duration
      log('benchmark', `fast-build (cold): ${formatDuration(results.fastBuildCold)}`)

      // Collect lib files from fast-build
      collectLibFiles(packages, FAST_BUILD_LIB)

      printSection('rush fast-build:validate (cold, --no-cache)', 6)
      const fastValidateColdArgs = ['fast-build:validate', '--no-cache', ...toArg]
      const fastValidateColdResult = await runCommand('rush', fastValidateColdArgs)
      results.fastValidateCold = fastValidateColdResult.duration
      log('benchmark', `fast-build:validate (cold): ${formatDuration(results.fastValidateCold)}`)

      printSection('rush fast-build:validate (warm, with cache)', 7)
      const fastValidateWarmArgs = ['fast-build:validate', ...toArg]
      const fastValidateWarmResult = await runCommand('rush', fastValidateWarmArgs)
      results.fastValidateWarm = fastValidateWarmResult.duration
      log('benchmark', `fast-build:validate (warm): ${formatDuration(results.fastValidateWarm)}`)

      // Collect types files from fast-build:validate
      collectTypesFiles(packages, FAST_VALIDATE_TYPES)
    }
  }

  // ========================================
  // Compare Outputs
  // ========================================
  printSection('Compare outputs', 8)

  console.log('')
  console.log('--- Comparing lib/ outputs ---')
  const libComparison = compareDirectories(
    RUSH_BUILD_LIB,
    FAST_BUILD_LIB,
    'rush-build',
    'fast-build'
  )
  results.libMatch = libComparison.match
  results.libStats = libComparison.stats

  console.log('')
  console.log('--- Comparing types/ outputs ---')
  const typesComparison = compareDirectories(
    RUSH_VALIDATE_TYPES,
    FAST_VALIDATE_TYPES,
    'rush-validate',
    'fast-validate'
  )
  results.typesMatch = typesComparison.match
  results.typesStats = typesComparison.stats

  // Write detailed report
  writeReport(OUTPUT_DIR, results, args.toPackage)

  // ========================================
  // Print Summary
  // ========================================
  printSection('Benchmark Summary', 9)
  printBenchmarkTable(results)

  // Final status
  console.log('')
  if (results.libMatch && results.typesMatch) {
    log('success', 'All outputs match! fast-build produces identical results to rush build.')
    process.exit(0)
  } else {
    log('error', 'Outputs differ. Check the comparison details above.')
    console.log('')
    console.log(`Comparison files are stored in: ${OUTPUT_DIR}`)
    console.log(`Different files are saved in: ${DIFFS_DIR}`)
    console.log('')
    console.log('To inspect differences:')
    console.log(`  - lib/ diffs:   ${path.join(DIFFS_DIR, 'rush-build-vs-fast-build')}`)
    console.log(`  - types/ diffs: ${path.join(DIFFS_DIR, 'rush-validate-vs-fast-validate')}`)
    process.exit(1)
  }
}

main().catch((err) => {
  log('error', err.message)
  process.exit(1)
})
