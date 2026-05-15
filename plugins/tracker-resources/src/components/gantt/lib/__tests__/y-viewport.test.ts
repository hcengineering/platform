//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  computeYViewport,
  rowIndexToY,
  sliceVisibleRows,
  yToRowIndex
} from '../y-viewport'

describe('computeYViewport', () => {
  it('returns empty range for zero rows', () => {
    const v = computeYViewport({ rowCount: 0, rowHeight: 32, scrollTop: 0, viewportHeight: 320 })
    expect(v.visibleRange).toEqual({ startIndex: 0, endIndex: 0 })
    expect(v.totalSize).toBe(0)
    expect(v.paddingTop).toBe(0)
    expect(v.paddingBottom).toBe(0)
  })

  it('top of list applies overscan only to the bottom', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: 0, viewportHeight: 320, overscan: 2 })
    expect(v.visibleRange.startIndex).toBe(0)
    expect(v.visibleRange.endIndex).toBe(12) // 10 rows fit + 2 overscan
    expect(v.paddingTop).toBe(0)
    expect(v.paddingBottom).toBe((100 - 12) * 32)
  })

  it('mid-list scroll applies symmetric overscan', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: 160, viewportHeight: 320, overscan: 2 })
    expect(v.visibleRange.startIndex).toBe(3) // 5 - 2
    expect(v.visibleRange.endIndex).toBe(17) // 5 + 10 + 2
    expect(v.paddingTop).toBe(3 * 32)
    expect(v.paddingBottom).toBe((100 - 17) * 32)
  })

  it('clamps end to rowCount when overscan overflows', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: 2880, viewportHeight: 320, overscan: 2 })
    expect(v.visibleRange.endIndex).toBe(100)
    expect(v.paddingBottom).toBe(0)
  })

  it('clamps negative scrollTop (rubber-band) to 0', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: -50, viewportHeight: 320, overscan: 2 })
    expect(v.visibleRange.startIndex).toBe(0)
    expect(v.paddingTop).toBe(0)
  })

  it('defaults overscan to 5 when omitted', () => {
    const v = computeYViewport({ rowCount: 200, rowHeight: 32, scrollTop: 320, viewportHeight: 320 })
    // top-row = 10, viewportRows = 10 → endIndex = 10 + 10 + 5 = 25
    // startIndex = 10 - 5 = 5
    expect(v.visibleRange.startIndex).toBe(5)
    expect(v.visibleRange.endIndex).toBe(25)
  })

  it('handles a viewport larger than the entire list', () => {
    const v = computeYViewport({ rowCount: 5, rowHeight: 32, scrollTop: 0, viewportHeight: 1000, overscan: 2 })
    expect(v.visibleRange.startIndex).toBe(0)
    expect(v.visibleRange.endIndex).toBe(5)
    expect(v.paddingTop).toBe(0)
    expect(v.paddingBottom).toBe(0)
  })

  it('returns full range when rowHeight is non-positive (defensive)', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 0, scrollTop: 0, viewportHeight: 320, overscan: 2 })
    expect(v.visibleRange.startIndex).toBe(0)
    expect(v.visibleRange.endIndex).toBe(100)
    expect(v.totalSize).toBe(0)
  })

  it('totalSize equals rowCount × rowHeight', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: 0, viewportHeight: 320 })
    expect(v.totalSize).toBe(3200)
  })

  it('paddingTop + visible height + paddingBottom equals totalSize', () => {
    const v = computeYViewport({ rowCount: 100, rowHeight: 32, scrollTop: 200, viewportHeight: 320, overscan: 2 })
    const visibleHeight = (v.visibleRange.endIndex - v.visibleRange.startIndex) * 32
    expect(v.paddingTop + visibleHeight + v.paddingBottom).toBe(v.totalSize)
  })
})

describe('rowIndexToY', () => {
  it('row 0 sits at y=0', () => {
    expect(rowIndexToY(0, 32)).toBe(0)
  })

  it('multiplies index × rowHeight', () => {
    expect(rowIndexToY(10, 32)).toBe(320)
    expect(rowIndexToY(7, 28)).toBe(196)
  })

  it('clamps negative indices to 0', () => {
    expect(rowIndexToY(-3, 32)).toBe(0)
  })
})

describe('yToRowIndex', () => {
  it('y=0 maps to row 0', () => {
    expect(yToRowIndex(0, 32, 100)).toBe(0)
  })

  it('floors fractional rows', () => {
    expect(yToRowIndex(159, 32, 100)).toBe(4) // 159/32 = 4.96875 → floor 4
  })

  it('clamps to totalRows - 1 when y overflows', () => {
    expect(yToRowIndex(99999, 32, 100)).toBe(99)
  })

  it('clamps negative y to 0', () => {
    expect(yToRowIndex(-50, 32, 100)).toBe(0)
  })

  it('returns 0 for empty list (degenerate)', () => {
    expect(yToRowIndex(100, 32, 0)).toBe(0)
  })

  it('treats non-positive rowHeight as no-op (returns 0)', () => {
    expect(yToRowIndex(100, 0, 100)).toBe(0)
  })
})

describe('sliceVisibleRows', () => {
  it('returns empty slice for empty input', () => {
    expect(sliceVisibleRows([], { top: 0, bottom: 100 })).toEqual([])
  })

  it('returns rows fully inside the bounds', () => {
    const rows = [
      { id: 'a', y: 0, height: 32 },
      { id: 'b', y: 32, height: 32 },
      { id: 'c', y: 64, height: 32 }
    ]
    const out = sliceVisibleRows(rows, { top: 0, bottom: 100 })
    expect(out).toHaveLength(3)
  })

  it('returns rows straddling the top edge', () => {
    const rows = [
      { id: 'a', y: 0, height: 32 },
      { id: 'b', y: 32, height: 32 }
    ]
    // viewport [16, 64) — row 'a' straddles top, row 'b' fully inside
    const out = sliceVisibleRows(rows, { top: 16, bottom: 64 })
    expect(out.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('returns rows straddling the bottom edge', () => {
    const rows = [
      { id: 'a', y: 0, height: 32 },
      { id: 'b', y: 32, height: 32 },
      { id: 'c', y: 64, height: 32 }
    ]
    // viewport [0, 80) — row 'c' straddles bottom (64..96)
    const out = sliceVisibleRows(rows, { top: 0, bottom: 80 })
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('excludes rows entirely above viewport', () => {
    const rows = [
      { id: 'a', y: 0, height: 32 },
      { id: 'b', y: 32, height: 32 },
      { id: 'c', y: 64, height: 32 }
    ]
    const out = sliceVisibleRows(rows, { top: 100, bottom: 200 })
    expect(out).toHaveLength(0)
  })

  it('excludes rows entirely below viewport', () => {
    const rows = [
      { id: 'a', y: 1000, height: 32 },
      { id: 'b', y: 1032, height: 32 }
    ]
    const out = sliceVisibleRows(rows, { top: 0, bottom: 100 })
    expect(out).toHaveLength(0)
  })

  it('boundary: row exactly at bottom edge is excluded (y === bounds.bottom)', () => {
    const rows = [{ id: 'a', y: 100, height: 32 }]
    const out = sliceVisibleRows(rows, { top: 0, bottom: 100 })
    expect(out).toHaveLength(0)
  })

  it('boundary: row exactly meeting top edge is included (y + height > bounds.top)', () => {
    const rows = [{ id: 'a', y: 0, height: 32 }]
    const out = sliceVisibleRows(rows, { top: 16, bottom: 64 })
    expect(out).toHaveLength(1)
  })
})
