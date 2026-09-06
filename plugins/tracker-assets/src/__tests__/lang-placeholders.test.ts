//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Placeholder parity between the locale files.
//
// `makeLocalesTest` only checks that `ru` mirrors the *key structure* of `en`.
// It cannot catch a translation that keeps the key but changes the ICU
// arguments — e.g. a German string asking for `{issue}` while the component
// passes `{title}`, or a copy-pasted string asking for `{start}`/`{due}` while
// the caller only passes `{days}`. Those render as literal `{issue}` in the UI
// for every user of that locale, and nothing else in the build notices.
//
// So: for every key a locale defines, its ICU argument set must equal the
// English one.

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const langDir = join(__dirname, '../../lang')

/**
 * Pre-existing gaps inherited from before this test was added. They are real
 * bugs in those translations, but fixing them needs a native speaker, so they
 * are pinned here instead of failing the build. Do not add new entries.
 */
const knownGaps = new Set(['tr:MoveAndDeleteMilestone'])

/**
 * Collect the ICU argument names of a message.
 *
 * A regex is not enough: in `Delete {n, plural, =1 {issue} other {# issues}}`
 * the `{issue}` is the *body* of a plural branch, not an argument. So this
 * walks the message and only treats a `{` as an argument when it is in message
 * position, recursing into sub-messages and honouring ICU's `'` escaping.
 */
function icuArguments (message: string): Set<string> {
  const out = new Set<string>()
  const end = message.length

  function skipWs (i: number): number {
    while (i < end && /\s/.test(message[i])) i++
    return i
  }

  function readIdent (i: number): [string, number] {
    const start = i
    while (i < end && /[A-Za-z0-9_]/.test(message[i])) i++
    return [message.slice(start, i), i]
  }

  function skipQuoted (i: number): number {
    // `''` is a literal quote, `'...'` escapes braces.
    if (i + 1 < end && message[i + 1] === "'") return i + 2
    const close = message.indexOf("'", i + 1)
    return close === -1 ? end : close + 1
  }

  // Reads an argument, `i` pointing just after its opening brace.
  function parseArgument (i: number): number {
    i = skipWs(i)
    const [name, afterName] = readIdent(i)
    i = afterName
    if (name.length > 0) out.add(name)
    i = skipWs(i)
    if (i < end && message[i] === '}') return i + 1
    if (i < end && message[i] === ',') {
      i = skipWs(i + 1)
      i = readIdent(i)[1] // argument type (plural, select, number, …)
      i = skipWs(i)
      if (i < end && message[i] === '}') return i + 1
      if (i < end && message[i] === ',') {
        i++
        // Style / option list: every `{` from here starts a sub-message.
        while (i < end) {
          const c = message[i]
          if (c === '{') {
            i = parseMessage(i + 1, true)
            continue
          }
          if (c === '}') return i + 1
          i++
        }
        return i
      }
    }
    while (i < end && message[i] !== '}') i++
    return i + 1
  }

  // Reads a message. `nested` messages stop at their closing brace.
  function parseMessage (i: number, nested: boolean): number {
    while (i < end) {
      const c = message[i]
      if (c === "'") {
        i = skipQuoted(i)
        continue
      }
      if (c === '{') {
        i = parseArgument(i + 1)
        continue
      }
      if (c === '}' && nested) return i + 1
      i++
    }
    return i
  }

  parseMessage(0, false)
  return out
}

function loadStrings (file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(langDir, file), 'utf-8')).string
}

describe('tracker locales', () => {
  const en = loadStrings('en.json')
  const others = readdirSync(langDir)
    .filter((f) => f.endsWith('.json') && f !== 'en.json')
    .sort()

  it('has locale files to compare', () => {
    expect(others.length).toBeGreaterThan(0)
  })

  it.each(others)('%s uses the same ICU arguments as en', (file) => {
    const lang = file.replace(/\.json$/, '')
    const strings = loadStrings(file)
    const mismatches: string[] = []
    for (const [key, value] of Object.entries(strings)) {
      const expected = en[key]
      if (expected === undefined) continue // extra keys are makeLocalesTest's job
      if (knownGaps.has(`${lang}:${key}`)) continue
      const want = [...icuArguments(expected)].sort()
      const got = [...icuArguments(value)].sort()
      if (want.join(',') !== got.join(',')) {
        mismatches.push(`${key}: en has {${want.join(', ')}}, ${lang} has {${got.join(', ')}}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})
