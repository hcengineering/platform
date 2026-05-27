import { tzTooltip } from '../components/admin-audit/tzTooltip'

describe('V8 — tzTooltip', () => {
  // 2026-06-15 12:00:00 UTC = 14:00 in Europe/Vienna (DST)
  const summerMs = Date.UTC(2026, 5, 15, 12, 0, 0)
  // 2026-12-15 12:00:00 UTC = 13:00 in Europe/Vienna (non-DST)
  const winterMs = Date.UTC(2026, 11, 15, 12, 0, 0)

  test('contains UTC line in canonical form', () => {
    const out = tzTooltip(summerMs)
    expect(out).toContain('UTC: 2026-06-15 12:00:00')
  })

  test('contains Local time prefix', () => {
    const out = tzTooltip(summerMs)
    expect(out).toMatch(/^Local time:/)
  })

  test('Intl unavailable → degraded "Local time:" without zone name', () => {
    const originalIntl = (globalThis as any).Intl
    ;(globalThis as any).Intl = undefined
    try {
      const out = tzTooltip(summerMs)
      expect(out).toContain('Local time:')
      expect(out).toContain('UTC:')
      expect(out).not.toMatch(/UTC[+-]\d/)
    } finally {
      ;(globalThis as any).Intl = originalIntl
    }
  })

  test('two-line shape (Local then UTC, separated by newline)', () => {
    const out = tzTooltip(summerMs)
    const lines = out.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^Local time:/)
    expect(lines[1]).toMatch(/^UTC:/)
  })

  test('winter (non-DST) timestamp still produces UTC line', () => {
    const out = tzTooltip(winterMs)
    expect(out).toContain('UTC: 2026-12-15 12:00:00')
  })
})
