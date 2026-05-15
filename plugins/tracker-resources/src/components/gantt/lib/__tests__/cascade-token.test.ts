//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { newCascadeToken } from '../cascade-token'

describe('newCascadeToken — default prefix', () => {
  it('uses the gantt-cascade prefix when no argument is given', () => {
    const token = newCascadeToken()
    expect(token.startsWith('gantt-cascade:')).toBe(true)
  })

  it('emits a colon separator between prefix and suffix', () => {
    const token = newCascadeToken()
    const segments = token.split(':')
    expect(segments.length).toBe(2)
    expect(segments[0]).toBe('gantt-cascade')
    expect(segments[1].length).toBeGreaterThan(0)
  })
})

describe('newCascadeToken — custom prefix', () => {
  it('uses the supplied prefix verbatim', () => {
    expect(newCascadeToken('gantt-cascade-bypass').startsWith('gantt-cascade-bypass:')).toBe(true)
    expect(newCascadeToken('gantt-bulk-drag').startsWith('gantt-bulk-drag:')).toBe(true)
    expect(newCascadeToken('gantt-no-cascade').startsWith('gantt-no-cascade:')).toBe(true)
  })

  it('preserves prefix even when it contains its own dashes/digits', () => {
    expect(newCascadeToken('scope-7-x').startsWith('scope-7-x:')).toBe(true)
  })
})

describe('newCascadeToken — suffix format', () => {
  it('produces a <date>-<counter> suffix with numeric segments', () => {
    const token = newCascadeToken()
    const suffix = token.slice('gantt-cascade:'.length)
    expect(suffix).toMatch(/^\d+-\d+$/)
  })

  it('uses the current epoch millis for the leading suffix segment', () => {
    const before = Date.now()
    const token = newCascadeToken()
    const after = Date.now()
    const stamp = Number(token.slice('gantt-cascade:'.length).split('-')[0])
    expect(stamp).toBeGreaterThanOrEqual(before)
    expect(stamp).toBeLessThanOrEqual(after)
  })
})

describe('newCascadeToken — uniqueness', () => {
  it('emits a different token on every call within the same tick', () => {
    const a = newCascadeToken()
    const b = newCascadeToken()
    const c = newCascadeToken()
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect(a).not.toBe(c)
  })

  it('emits distinct tokens across 1000 rapid calls', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 1000; i++) seen.add(newCascadeToken('bulk'))
    expect(seen.size).toBe(1000)
  })
})

describe('newCascadeToken — counter monotonicity within a tick', () => {
  it('increments the trailing counter segment on consecutive calls', () => {
    const counterOf = (t: string): number => Number(t.split('-').pop() ?? '0')
    const a = counterOf(newCascadeToken())
    const b = counterOf(newCascadeToken())
    const c = counterOf(newCascadeToken())
    expect(b).toBe(a + 1)
    expect(c).toBe(b + 1)
  })
})
