#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const [, , inFile = 'coverage/lcov.info', outDir = 'coverage/html'] = process.argv

if (!fs.existsSync(inFile)) {
  console.error('Input lcov not found:', inFile)
  process.exit(1)
}

const lcovParse = require('lcov-parse')
const libCoverage = require('istanbul-lib-coverage')
const reports = require('istanbul-reports')
const libReport = require('istanbul-lib-report')

const data = fs.readFileSync(inFile, 'utf8')

// build repo file index to resolve source files
const root = process.cwd()
const ignoreDirs = new Set(['node_modules', '.git', 'coverage', 'lib', 'dist', 'types', '.rush', 'temp', 'pnpm-store'])
const repoFiles = []
function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const it of items) {
    if (it.isDirectory()) {
      if (ignoreDirs.has(it.name)) continue
      if (it.name.startsWith('.')) continue
      try {
        walk(path.join(dir, it.name))
      } catch (e) {}
    } else if (it.isFile()) {
      repoFiles.push(path.join(dir, it.name))
    }
  }
}
try {
  walk(root)
} catch (e) {}

lcovParse(data, (err, parsed) => {
  if (err) {
    console.error('lcov-parse error:', err)
    process.exit(1)
  }

  const map = libCoverage.createCoverageMap({})
  for (const file of parsed) {
    // parsed entries include 'file', 'lines', 'functions', 'branches'
    const coverage = {
      path: file.file,
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {}
    }

    // The lcov parser gives line coverage data; create synthetic statement entries per line
    if (file.lines && file.lines.details) {
      let idx = 0
      for (const d of file.lines.details) {
        idx++
        const key = String(idx)
        coverage.statementMap[key] = { start: { line: d.line, column: 0 }, end: { line: d.line, column: 0 } }
        coverage.s[key] = d.hit
      }
    }

    // functions and branches are ignored for more accurate tools; keep minimal
    map.addFileCoverage(coverage)
  }

  // custom source finder: try absolute, repo-relative, and suffix matches
  const sourceFinder = (filePath) => {
    try {
      if (!global.__seenPaths) global.__seenPaths = []
      if (global.__seenPaths.length < 500) global.__seenPaths.push(filePath)
      if (global.__seenPaths.length === 500 && !global.__seenLogged) {
        console.error('sourceFinder seen paths (sample):\n', global.__seenPaths.join('\n'))
        global.__seenLogged = true
      }
      if (global.__seenPaths.length <= 200) console.error('sourceFinder request:', filePath)
    } catch (e) {}
    try {
      if (path.isAbsolute(filePath) && fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8')
      const abs1 = path.resolve(root, filePath)
      if (fs.existsSync(abs1)) return fs.readFileSync(abs1, 'utf8')
      // try suffix match
      const found = repoFiles.find((p) => p.endsWith(path.sep + filePath) || p.endsWith(filePath))
      if (found) return fs.readFileSync(found, 'utf8')
      // debug unresolved
      if (!found) {
        try {
          if (!global.__unresolved) global.__unresolved = new Set()
          if (global.__unresolved.size < 200) global.__unresolved.add(filePath)
        } catch (e) {}
      }
    } catch (e) {
      // ignore and return null below
    }
    return null
  }

  const context = libReport.createContext({ dir: outDir, coverageMap: map, sourceFinder })
  const report = reports.create('html', {})
  report.execute(context)
  if (global.__unresolved && global.__unresolved.size) {
    console.error('Unresolved filePath samples:\n', Array.from(global.__unresolved).slice(0, 50).join('\n'))
  }
  console.log('HTML report generated in', outDir)
  // Post-process HTML files: if any report page contains the 'Unable to lookup source' placeholder,
  // replace it with the actual source file contents when we can resolve it.
  try {
    for (const file of parsed) {
      const srcAbs = file.file
      // normalize key as used by report (from last '/src/' onward) if present
      let key
      const idx = srcAbs.lastIndexOf(path.sep + 'src' + path.sep)
      if (idx !== -1) key = srcAbs.slice(idx + 1)
      else key = path.basename(srcAbs)

      const htmlPath = path.join(outDir, key + '.html')
      if (!fs.existsSync(htmlPath)) continue
      let html = fs.readFileSync(htmlPath, 'utf8')
      if (!html.includes('Unable to lookup source')) continue
      // read source
      let src
      try {
        src = fs.readFileSync(srcAbs, 'utf8')
      } catch (e) {
        src = null
      }
      if (!src) {
        // try suffix match in repoFiles
        const found = repoFiles.find((p) => p.endsWith(path.sep + key) || p.endsWith(key))
        if (found) src = fs.readFileSync(found, 'utf8')
      }
      if (!src) continue
      // escape HTML
      const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // replace the first prettyprint <pre>...</pre> block that contains 'Unable to lookup source'
      html = html.replace(
        /<pre class="prettyprint[\s\S]*?>[\s\S]*?Unable to lookup source:[\s\S]*?<\/pre>/,
        `<pre class="prettyprint lang-js">${esc}</pre>`
      )
      fs.writeFileSync(htmlPath, html, 'utf8')
    }
  } catch (e) {
    console.error('post-process html error', e)
  }
})
