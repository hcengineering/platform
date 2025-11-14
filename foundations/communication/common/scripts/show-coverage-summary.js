#!/usr/bin/env node

/**
 * Display coverage summary from lcov.info file
 * Usage: node show-coverage-summary.js [lcov-file-path]
 */

const fs = require('fs')
const path = require('path')

const lcovFile = process.argv[2] || 'coverage/lcov.info'
const root = process.cwd()
const lcovPath = path.isAbsolute(lcovFile) ? lcovFile : path.join(root, lcovFile)

if (!fs.existsSync(lcovPath)) {
  console.error(`Error: LCOV file not found: ${lcovPath}`)
  process.exit(1)
}

console.log('==============================================')
console.log('COVERAGE SUMMARY BY PACKAGE')
console.log('==============================================')
console.log('')

const data = fs.readFileSync(lcovPath, 'utf8')
const lines = data.split(/\r?\n/)

const fileStats = new Map()
const filePkg = new Map()
let currentFile = ''

// Parse lcov.info
for (const line of lines) {
  if (line.startsWith('SF:')) {
    currentFile = line.substring(3)
    fileStats.set(currentFile, { total: 0, covered: 0 })

    // Extract package name from path
    const parts = currentFile.split(path.sep)
    const pkgIndex = parts.indexOf('packages')
    if (pkgIndex !== -1 && pkgIndex + 1 < parts.length) {
      filePkg.set(currentFile, parts[pkgIndex + 1])
    }
  } else if (line.startsWith('DA:')) {
    const [lineNum, hitCount] = line.substring(3).split(',')
    const stats = fileStats.get(currentFile)
    if (stats) {
      stats.total++
      if (parseInt(hitCount) > 0) {
        stats.covered++
      }
    }
  }
}

// Aggregate by package
const pkgStats = new Map()
for (const [file, stats] of fileStats) {
  const pkg = filePkg.get(file)
  if (pkg) {
    if (!pkgStats.has(pkg)) {
      pkgStats.set(pkg, { total: 0, covered: 0 })
    }
    const pkgStat = pkgStats.get(pkg)
    pkgStat.total += stats.total
    pkgStat.covered += stats.covered
  }
}

// Sort packages alphabetically
const sortedPackages = Array.from(pkgStats.keys()).sort()

// Display header
console.log(padRight('Package', 25) + padLeft('Covered', 10) + padLeft('Total', 10) + padLeft('Coverage', 10))
console.log('----------------------------------------------')

// Display package stats
let overallCovered = 0
let overallTotal = 0

for (const pkg of sortedPackages) {
  const stats = pkgStats.get(pkg)
  const pct = (stats.covered / stats.total) * 100
  console.log(
    padRight(pkg, 25) +
      padLeft(stats.covered.toString(), 10) +
      padLeft(stats.total.toString(), 10) +
      padLeft(pct.toFixed(2) + '%', 10)
  )
  overallCovered += stats.covered
  overallTotal += stats.total
}

// Display total
console.log('----------------------------------------------')
const overallPct = (overallCovered / overallTotal) * 100
console.log(
  padRight('TOTAL', 25) +
    padLeft(overallCovered.toString(), 10) +
    padLeft(overallTotal.toString(), 10) +
    padLeft(overallPct.toFixed(2) + '%', 10)
)
console.log('')

console.log('==============================================')
console.log('')
console.log('HTML report available at: coverage/html/index.html')
console.log(`Merged LCOV file available at: ${lcovFile}`)

// Helper functions
function padRight(str, width) {
  return str + ' '.repeat(Math.max(0, width - str.length))
}

function padLeft(str, width) {
  return ' '.repeat(Math.max(0, width - str.length)) + str
}
