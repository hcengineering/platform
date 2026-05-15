//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { computeVisibleRowRange } from '../sidebar-virtualization'

describe('computeVisibleRowRange', () => {
  it('returns empty range for zero rows', () => {
    const r = computeVisibleRowRange({ totalRows: 0, rowHeight: 32, scrollTop: 0, viewportHeight: 320, overscan: 2 })
    expect(r).toEqual({ start: 0, end: 0, paddingTop: 0, paddingBottom: 0 })
  })

  it('top of list (scrollTop=0) starts at index 0 with overscan applied to the bottom', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: 0, viewportHeight: 320, overscan: 2 })
    // viewport fits 10 rows; overscan adds 2 below
    expect(r.start).toBe(0)
    expect(r.end).toBe(12)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe((100 - 12) * 32)
  })

  it('mid-list scroll applies overscan symmetrically', () => {
    // scrollTop = 160 means top of viewport is row 5
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: 160, viewportHeight: 320, overscan: 2 })
    expect(r.start).toBe(3) // 5 - 2 overscan
    expect(r.end).toBe(17) // 5 + 10 + 2 overscan
    expect(r.paddingTop).toBe(3 * 32)
    expect(r.paddingBottom).toBe((100 - 17) * 32)
  })

  it('clamps start to 0 when overscan would underflow', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: 32, viewportHeight: 320, overscan: 5 })
    expect(r.start).toBe(0)
    expect(r.paddingTop).toBe(0)
  })

  it('clamps end to totalRows when overscan would overflow', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: 2880, viewportHeight: 320, overscan: 2 })
    // top row index = 90, +10 viewport rows + 2 overscan = 102 → clamp to 100
    expect(r.start).toBeGreaterThanOrEqual(88)
    expect(r.end).toBe(100)
    expect(r.paddingBottom).toBe(0)
  })

  it('handles a viewport larger than the entire list', () => {
    const r = computeVisibleRowRange({ totalRows: 5, rowHeight: 32, scrollTop: 0, viewportHeight: 1000, overscan: 2 })
    expect(r.start).toBe(0)
    expect(r.end).toBe(5)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe(0)
  })

  it('handles zero overscan (tight viewport)', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: 0, viewportHeight: 320, overscan: 0 })
    expect(r.start).toBe(0)
    expect(r.end).toBe(10)
  })

  it('handles negative scrollTop (rubber-band) as scrollTop=0', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 32, scrollTop: -50, viewportHeight: 320, overscan: 2 })
    expect(r.start).toBe(0)
    expect(r.paddingTop).toBe(0)
  })

  it('rejects rowHeight <= 0 by returning the full range as a safe fallback', () => {
    const r = computeVisibleRowRange({ totalRows: 100, rowHeight: 0, scrollTop: 0, viewportHeight: 320, overscan: 2 })
    expect(r.start).toBe(0)
    expect(r.end).toBe(100)
    expect(r.paddingTop).toBe(0)
    expect(r.paddingBottom).toBe(0)
  })

  it('paddingTop + visibleHeight + paddingBottom = totalRows × rowHeight', () => {
    const totalRows = 100
    const rowHeight = 32
    const r = computeVisibleRowRange({ totalRows, rowHeight, scrollTop: 200, viewportHeight: 320, overscan: 2 })
    const visibleHeight = (r.end - r.start) * rowHeight
    expect(r.paddingTop + visibleHeight + r.paddingBottom).toBe(totalRows * rowHeight)
  })
})
