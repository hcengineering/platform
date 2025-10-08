#!/usr/bin/env node

/**
 * Run tests with coverage for all packages
 * This is a replacement for show-coverage.sh
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const root = process.cwd()
const packagesDir = path.join(root, 'packages')

if (!fs.existsSync(packagesDir)) {
  console.error('Error: packages directory not found')
  process.exit(1)
}

console.log('=== RUNNING TESTS WITH COVERAGE ===')
console.log('')

const packages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort()

async function runTestsForPackage(pkgName) {
  const pkgDir = path.join(packagesDir, pkgName)
  const packageJson = path.join(pkgDir, 'package.json')

  if (!fs.existsSync(packageJson)) {
    return null
  }

  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'))
  if (!pkg.scripts || !pkg.scripts.test) {
    return null
  }

  console.log(`📦 Package: ${pkgName}`)
  console.log('---')

  return new Promise((resolve) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npm, ['test', '--', '--coverage', '--silent'], {
      cwd: pkgDir,
      stdio: 'pipe',
      shell: true
    })

    let output = ''
    let inSummary = false

    child.stdout.on('data', (data) => {
      const text = data.toString()
      output += text

      // Extract coverage summary
      const lines = text.split('\n')
      for (const line of lines) {
        if (line.includes('Coverage summary') || line.includes('----------')) {
          inSummary = true
        }
        if (
          inSummary &&
          (line.includes('Statements') ||
            line.includes('Branches') ||
            line.includes('Functions') ||
            line.includes('Lines'))
        ) {
          console.log(line.trim())
        }
        if (inSummary && line.trim() === '') {
          inSummary = false
        }
      }
    })

    child.stderr.on('data', (data) => {
      // Ignore stderr for cleaner output
    })

    child.on('close', (code) => {
      console.log('')
      resolve({ package: pkgName, code, output })
    })
  })
}

async function main() {
  const results = []

  for (const pkg of packages) {
    const result = await runTestsForPackage(pkg)
    if (result) {
      results.push(result)
    }
  }

  console.log('=== END OF COVERAGE REPORT ===')
  console.log('')
  console.log(`Tested ${results.length} packages`)

  const failed = results.filter((r) => r.code !== 0)
  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} package(s) had test failures:`)
    failed.forEach((r) => console.log(`   - ${r.package}`))
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
