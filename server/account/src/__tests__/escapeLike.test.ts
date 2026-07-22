//
// Copyright © 2026 Hardcore Engineering Inc.
//
import { escapeLike } from '../util/escapeLike'

describe('escapeLike', () => {
  it('passes through plain alphanumeric strings unchanged', () => {
    expect(escapeLike('hello')).toBe('hello')
    expect(escapeLike('jane@example.com')).toBe('jane@example.com')
  })

  it('escapes the LIKE wildcards % and _', () => {
    // Without escaping, `%` matches any substring (effectively unfiltered)
    // and `_` matches a single character. After escaping, both are
    // pattern-literal — the admin search box behaves as a substring filter.
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('% and _')).toBe('\\% and \\_')
  })

  it('escapes the backslash escape character itself', () => {
    // A literal backslash in user input must be doubled so that PG's
    // ESCAPE '\\' clause sees `\\\\` -> `\\` -> a literal backslash, not
    // an escape for the following character.
    expect(escapeLike('a\\b')).toBe('a\\\\b')
  })

  it('leaves the empty string alone', () => {
    expect(escapeLike('')).toBe('')
  })
})
