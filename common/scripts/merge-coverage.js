#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const patterns = ['packages', 'pods', 'tests']
let files = []
for (const p of patterns) {
  const dir = path.join(root, p)
  if (!fs.existsSync(dir)) continue
  const items = fs.readdirSync(dir)
  for (const it of items) {
    const lcov = path.join(dir, it, 'coverage', 'lcov.info')
    if (fs.existsSync(lcov)) files.push(lcov)
  }
}

if (files.length === 0) {
  console.error('No lcov files found in packages/pods/tests/*/coverage/lcov.info')
  process.exit(1)
}

const outDir = path.join(root, 'coverage')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'lcov.info')

let outData = ''
let seenTN = false
// Build a repo file index to help resolve SF entries that are ambiguous
const ignoreDirs = new Set(['node_modules', '.git', 'coverage', 'lib', 'dist', 'types', '.rush', 'temp', 'pnpm-store'])
const repoFiles = []
function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const it of items) {
    if (it.isDirectory()) {
      if (ignoreDirs.has(it.name)) continue
      // skip hidden folders except top-level .config maybe
      if (it.name.startsWith('.')) continue
      try {
        walk(path.join(dir, it.name))
      } catch (e) {
        // ignore permission errors
      }
    } else if (it.isFile()) {
      repoFiles.push(path.join(dir, it.name))
    }
  }
}
try {
  walk(root)
} catch (e) {
  /* ignore */
}

for (const f of files) {
  const data = fs.readFileSync(f, 'utf8')
  const pkgDir = path.dirname(path.dirname(f))
  const lines = data.split(/\r?\n/)
  const outLines = []
  for (const line of lines) {
    if (!line) continue
    // skip duplicate TN: headers (test name)
    if (line.startsWith('TN:')) {
      if (seenTN) continue
      seenTN = true
      outLines.push(line)
      continue
    }

    if (line.startsWith('SF:')) {
      const orig = line.slice(3)
      // if path is absolute and exists, keep it; otherwise resolve from package dir
      if (path.isAbsolute(orig)) {
        outLines.push('SF:' + orig)
        continue
      }

      const abs = path.resolve(pkgDir, orig)
      if (fs.existsSync(abs)) {
        outLines.push('SF:' + abs)
      } else {
        // try package/src/orig if orig is not already prefixed with src
        const alt = path.resolve(pkgDir, orig)
        if (fs.existsSync(alt)) {
          outLines.push('SF:' + path.relative(root, alt))
        } else {
          // try to find any file in repo that ends with the orig path
          const found = repoFiles.find((p) => p.endsWith(path.sep + orig) || p.endsWith(orig))
          if (found) {
            outLines.push('SF:' + found)
          } else {
            // keep original if we can't resolve
            outLines.push('SF:' + orig)
          }
        }
      }
      continue
    }

    outLines.push(line)
  }

  outData += outLines.join('\n') + '\n'
}
fs.writeFileSync(outFile, outData, 'utf8')
console.log('Merged', files.length, 'lcov files into', outFile)
