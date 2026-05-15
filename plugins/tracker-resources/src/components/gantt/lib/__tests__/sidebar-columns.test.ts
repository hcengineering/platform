//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  parseColumns,
  clampWidth,
  DEFAULT_WIDTHS,
  DEFAULT_COLUMNS,
  ALL_COLUMN_KEYS,
  MIN_WIDTH,
  MAX_WIDTH,
  type SidebarColumnKey
} from '../sidebar-columns'

describe('sidebar-columns: parseColumns', () => {
  it('returns DEFAULT_COLUMNS for undefined', () => {
    expect(parseColumns(undefined)).toEqual(DEFAULT_COLUMNS)
  })

  it('returns DEFAULT_COLUMNS for null', () => {
    expect(parseColumns(null)).toEqual(DEFAULT_COLUMNS)
  })

  it('returns DEFAULT_COLUMNS for non-array values', () => {
    expect(parseColumns(42)).toEqual(DEFAULT_COLUMNS)
    expect(parseColumns('identifier')).toEqual(DEFAULT_COLUMNS)
    expect(parseColumns({ identifier: true })).toEqual(DEFAULT_COLUMNS)
  })

  it('keeps a valid single-column array', () => {
    expect(parseColumns(['identifier'])).toEqual(['identifier'])
  })

  it('filters out unknown column keys', () => {
    expect(parseColumns(['identifier', 'bogus', 'title'])).toEqual(['identifier', 'title'])
  })

  it('returns DEFAULT_COLUMNS when array is empty (min 1 column rule)', () => {
    expect(parseColumns([])).toEqual(DEFAULT_COLUMNS)
  })

  it('returns DEFAULT_COLUMNS when all entries are invalid', () => {
    expect(parseColumns(['bogus', 'other'])).toEqual(DEFAULT_COLUMNS)
  })

  it('preserves order of valid entries', () => {
    expect(parseColumns(['title', 'identifier'])).toEqual(['title', 'identifier'])
  })

  it('deduplicates repeated keys', () => {
    expect(parseColumns(['title', 'title', 'identifier'])).toEqual(['title', 'identifier'])
  })
})

describe('sidebar-columns: clampWidth', () => {
  it('clamps below MIN_WIDTH', () => {
    expect(clampWidth(20)).toBe(MIN_WIDTH)
    expect(clampWidth(0)).toBe(MIN_WIDTH)
    expect(clampWidth(-5)).toBe(MIN_WIDTH)
  })

  it('clamps above MAX_WIDTH', () => {
    expect(clampWidth(500)).toBe(MAX_WIDTH)
    expect(clampWidth(10_000)).toBe(MAX_WIDTH)
  })

  it('returns value unchanged within range', () => {
    expect(clampWidth(40)).toBe(40)
    expect(clampWidth(150)).toBe(150)
    expect(clampWidth(400)).toBe(400)
  })

  it('rounds fractional pixel inputs', () => {
    expect(clampWidth(150.7)).toBe(151)
    expect(clampWidth(150.3)).toBe(150)
  })
})

describe('sidebar-columns: constants', () => {
  it('DEFAULT_WIDTHS covers every ALL_COLUMN_KEYS entry', () => {
    for (const key of ALL_COLUMN_KEYS) {
      expect(typeof DEFAULT_WIDTHS[key]).toBe('number')
      expect(DEFAULT_WIDTHS[key]).toBeGreaterThanOrEqual(MIN_WIDTH)
      expect(DEFAULT_WIDTHS[key]).toBeLessThanOrEqual(MAX_WIDTH)
    }
  })

  it('DEFAULT_COLUMNS is a subset of ALL_COLUMN_KEYS', () => {
    for (const k of DEFAULT_COLUMNS) {
      expect(ALL_COLUMN_KEYS).toContain(k as SidebarColumnKey)
    }
  })

  it('MIN_WIDTH < MAX_WIDTH', () => {
    expect(MIN_WIDTH).toBeLessThan(MAX_WIDTH)
  })
})
