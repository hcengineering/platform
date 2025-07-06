import { generateRecurringValues } from '../utils'

describe('generateRecurringValues', () => {
  const baseDate = new Date('2024-01-01T00:00:00Z').getTime()
  const from = new Date('2024-01-01T00:00:00Z').getTime()
  const to = new Date('2024-01-10T00:00:00Z').getTime()

  it('generates daily recurring values', () => {
    const rule = {
      freq: 'DAILY',
      interval: 1
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Should include each day from Jan 1 to Jan 10
    expect(result.length).toBe(10)
    expect(result[0]).toBe(baseDate)
    expect(result[9]).toBe(new Date('2024-01-10T00:00:00Z').getTime())
  })

  it('supports bySetPos (positive) for monthly frequency', () => {
    // 1st Monday of each month in the range
    const rule = {
      freq: 'MONTHLY',
      interval: 1,
      byDay: ['MO'],
      bySetPos: [1]
    }
    const from = new Date('2024-01-01T00:00:00Z').getTime()
    const to = new Date('2024-03-31T00:00:00Z').getTime()
    const baseDate = from
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // 1st Monday of Jan, Feb, Mar 2024
    expect(result.length).toBe(3)
    expect(new Date(result[0]).toISOString().slice(0, 10)).toBe('2024-01-01') // Jan 1, 2024 is Monday
    expect(new Date(result[1]).toISOString().slice(0, 10)).toBe('2024-02-05') // Feb 5, 2024 is Monday
    expect(new Date(result[2]).toISOString().slice(0, 10)).toBe('2024-03-04') // Mar 4, 2024 is Monday
  })

  it('supports bySetPos (negative) for monthly frequency', () => {
    // Last Friday of each month in the range
    const rule = {
      freq: 'MONTHLY',
      interval: 1,
      byDay: ['FR'],
      bySetPos: [-1]
    }
    const from = new Date('2024-01-01T00:00:00Z').getTime()
    const to = new Date('2024-03-31T00:00:00Z').getTime()
    const baseDate = from
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Last Friday of Jan, Feb, Mar 2024
    expect(result.length).toBe(3)
    expect(new Date(result[0]).toISOString().slice(0, 10)).toBe('2024-01-26')
    expect(new Date(result[1]).toISOString().slice(0, 10)).toBe('2024-02-23')
    expect(new Date(result[2]).toISOString().slice(0, 10)).toBe('2024-03-29')
  })

  it('supports bySetPos (positive) for yearly frequency', () => {
    // 1st Sunday of January for each year in range
    const rule = {
      freq: 'YEARLY',
      interval: 1,
      byMonth: [0], // January
      byDay: ['SU'],
      bySetPos: [1]
    }
    const from = new Date('2024-01-01T00:00:00Z').getTime()
    const to = new Date('2026-12-31T00:00:00Z').getTime()
    const baseDate = from
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // 1st Sunday of Jan 2024, 2025, 2026
    expect(result.length).toBe(3)
    expect(new Date(result[0]).toISOString().slice(0, 10)).toBe('2024-01-07')
    expect(new Date(result[1]).toISOString().slice(0, 10)).toBe('2025-01-05')
    expect(new Date(result[2]).toISOString().slice(0, 10)).toBe('2026-01-04')
  })

  it('supports bySetPos (negative) for yearly frequency', () => {
    // Last Wednesday of December for each year in range
    const rule = {
      freq: 'YEARLY',
      interval: 1,
      byMonth: [11], // December
      byDay: ['WE'],
      bySetPos: [-1]
    }
    const from = new Date('2024-01-01T00:00:00Z').getTime()
    const to = new Date('2026-12-31T00:00:00Z').getTime()
    const baseDate = from
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Last Wednesday of Dec 2024, 2025, 2026
    expect(result.length).toBe(3)
    expect(new Date(result[0]).toISOString().slice(0, 10)).toBe('2024-12-25')
    expect(new Date(result[1]).toISOString().slice(0, 10)).toBe('2025-12-31')
    expect(new Date(result[2]).toISOString().slice(0, 10)).toBe('2026-12-30')
  })

  it('generates weekly recurring values', () => {
    const rule = {
      freq: 'WEEKLY',
      interval: 1,
      byDay: ['TU'] // Only Tuesdays
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Jan 2 and Jan 9 are Tuesdays in 2024
    expect(result.length).toBe(2)
    expect(new Date(result[0]).getUTCDay()).toBe(2)
    expect(new Date(result[1]).getUTCDay()).toBe(2)
  })

  it('generates monthly recurring values', () => {
    const rule = {
      freq: 'MONTHLY',
      interval: 1,
      byMonthDay: [1]
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Only Jan 1 falls in the range
    expect(result.length).toBe(1)
    expect(result[0]).toBe(baseDate)
  })

  it('generates yearly recurring values', () => {
    const rule = {
      freq: 'YEARLY',
      interval: 1,
      byMonth: [0], // January
      byMonthDay: [1]
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    // Only Jan 1, 2024
    expect(result.length).toBe(1)
    expect(result[0]).toBe(baseDate)
  })

  it('respects count limit', () => {
    const rule = {
      freq: 'DAILY',
      interval: 1,
      count: 3
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    expect(result.length).toBe(3)
  })

  it('respects endDate limit', () => {
    const rule = {
      freq: 'DAILY',
      interval: 1,
      endDate: new Date('2024-01-03T00:00:00Z').getTime()
    }
    const result = generateRecurringValues(rule as any, baseDate, from, to)
    expect(result.length).toBe(3)
    expect(result[2]).toBe(new Date('2024-01-03T00:00:00Z').getTime())
  })

  it('throws on invalid frequency', () => {
    const rule = {
      freq: 'INVALID'
    }
    expect(() => generateRecurringValues(rule as any, baseDate, from, to)).toThrow('Invalid recurring rule frequency')
  })
})
