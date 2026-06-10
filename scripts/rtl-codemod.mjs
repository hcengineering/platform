#!/usr/bin/env node
// RTL codemod: rewrite physical CSS properties to direction-aware *logical*
// properties across all `.scss` files and `<style>` blocks in `.svelte` files.
//
// In a left-to-right document every logical property below is exactly equivalent
// to the physical one it replaces (margin-inline-start === margin-left when
// dir=ltr), so this does NOT change existing LTR rendering. Under dir=rtl the
// same rules now mirror automatically.
//
// It only rewrites at *property position* (start of a declaration), never inside
// selectors or SCSS variables.
//
// Usage:
//   node scripts/rtl-codemod.mjs          # apply
//   node scripts/rtl-codemod.mjs --dry    # report counts only
//
// Reversible: tracked script; `git checkout` to undo the edits it makes.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SKIP = new Set(['node_modules', '.git', 'lib', 'dist', 'temp', 'deploy', 'dll'])

// Property-position guard for bare offsets: start-of-decl + captured indent.
const HEAD = '(^|[;{]|\\n)([ \\t]*)'

// Order matters: compound names before shorter ones so `border-left-color` is
// handled before `border-left`, and `border-left` before a bare `left`.
const RULES = [
  // border corner radii (logical 2-axis equivalents)
  [/border-top-left-radius(\s*:)/g, 'border-start-start-radius$1'],
  [/border-top-right-radius(\s*:)/g, 'border-start-end-radius$1'],
  [/border-bottom-left-radius(\s*:)/g, 'border-end-start-radius$1'],
  [/border-bottom-right-radius(\s*:)/g, 'border-end-end-radius$1'],
  // border sides (incl -width/-style/-color)
  [/border-left(-width|-style|-color)?(\s*:)/g, 'border-inline-start$1$2'],
  [/border-right(-width|-style|-color)?(\s*:)/g, 'border-inline-end$1$2'],
  // margins / paddings
  [/margin-left(\s*:)/g, 'margin-inline-start$1'],
  [/margin-right(\s*:)/g, 'margin-inline-end$1'],
  [/padding-left(\s*:)/g, 'padding-inline-start$1'],
  [/padding-right(\s*:)/g, 'padding-inline-end$1'],
  // positioning offsets — bare `left:` / `right:` at property position only
  [new RegExp(HEAD + 'left(\\s*:)', 'g'), '$1$2inset-inline-start$3'],
  [new RegExp(HEAD + 'right(\\s*:)', 'g'), '$1$2inset-inline-end$3'],
  // value-side logical keywords
  [/text-align(\s*:\s*)left\b/g, 'text-align$1start'],
  [/text-align(\s*:\s*)right\b/g, 'text-align$1end'],
  [/float(\s*:\s*)left\b/g, 'float$1inline-start'],
  [/float(\s*:\s*)right\b/g, 'float$1inline-end'],
  [/clear(\s*:\s*)left\b/g, 'clear$1inline-start'],
  [/clear(\s*:\s*)right\b/g, 'clear$1inline-end']
]

const interpolate = (rep, m) => rep.replace(/\$(\d+)/g, (_, d) => m[Number(d)] ?? '')

function runCss (css) {
  let out = css
  let count = 0
  for (const [re, rep] of RULES) {
    out = out.replace(re, (...m) => { count++; return interpolate(rep, m) })
  }
  return { out, count }
}

function transform (text, isSvelte) {
  if (!isSvelte) return runCss(text)
  // Only touch <style ...>...</style> blocks in svelte files.
  let count = 0
  const out = text.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (full, open, body, close) => {
    const r = runCss(body); count += r.count; return open + r.out + close
  })
  return { out, count }
}

function walk (dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    let st; try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, files)
    else if (name.endsWith('.scss') || name.endsWith('.svelte')) files.push(p)
  }
  return files
}

const files = walk(ROOT)
let changedFiles = 0
let totalRules = 0
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  const { out, count } = transform(text, f.endsWith('.svelte'))
  if (count > 0 && out !== text) {
    totalRules += count
    changedFiles++
    if (!DRY) writeFileSync(f, out, 'utf8')
  }
}
console.log(`${DRY ? '[dry] ' : ''}Scanned ${files.length} files; ${changedFiles} files / ${totalRules} declarations ${DRY ? 'would be ' : ''}rewritten to logical properties.`)
