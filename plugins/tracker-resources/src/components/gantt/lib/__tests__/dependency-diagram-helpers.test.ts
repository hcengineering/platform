//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  DIAGRAM_KINDS,
  clampLagSlider,
  diagramGridIndex,
  getDiagramSvgPaths
} from '../../../dependency/diagram-helpers'

describe('DIAGRAM_KINDS', () => {
  it('contains all four kinds in 2x2 grid order (FS, SS, FF, SF)', () => {
    expect(DIAGRAM_KINDS).toEqual(['FS', 'SS', 'FF', 'SF'])
  })
})

describe('clampLagSlider', () => {
  it('passes through values inside range', () => {
    expect(clampLagSlider(0)).toBe(0)
    expect(clampLagSlider(5)).toBe(5)
    expect(clampLagSlider(-5)).toBe(-5)
    expect(clampLagSlider(14)).toBe(14)
    expect(clampLagSlider(-14)).toBe(-14)
  })

  it('clamps high values to slider max', () => {
    expect(clampLagSlider(20)).toBe(14)
    expect(clampLagSlider(999)).toBe(14)
  })

  it('clamps low values to slider min', () => {
    expect(clampLagSlider(-20)).toBe(-14)
    expect(clampLagSlider(-999)).toBe(-14)
  })

  it('rounds floats', () => {
    expect(clampLagSlider(2.4)).toBe(2)
    expect(clampLagSlider(2.6)).toBe(3)
    expect(clampLagSlider(-2.5)).toBe(-2) // round half to even / -2 standard
  })

  it('NaN becomes 0', () => {
    expect(clampLagSlider(Number.NaN)).toBe(0)
  })

  it('accepts custom bounds', () => {
    expect(clampLagSlider(50, -30, 90)).toBe(50)
    expect(clampLagSlider(-50, -30, 90)).toBe(-30)
    expect(clampLagSlider(150, -30, 90)).toBe(90)
  })
})

describe('diagramGridIndex (2x2 grid: FS=top-left, SS=top-right, FF=bottom-left, SF=bottom-right)', () => {
  it('navigates from FS', () => {
    expect(diagramGridIndex('FS', 'right')).toBe('SS')
    expect(diagramGridIndex('FS', 'down')).toBe('FF')
    expect(diagramGridIndex('FS', 'up')).toBeNull()
    expect(diagramGridIndex('FS', 'left')).toBeNull()
  })

  it('navigates from SS', () => {
    expect(diagramGridIndex('SS', 'left')).toBe('FS')
    expect(diagramGridIndex('SS', 'down')).toBe('SF')
    expect(diagramGridIndex('SS', 'up')).toBeNull()
    expect(diagramGridIndex('SS', 'right')).toBeNull()
  })

  it('navigates from FF', () => {
    expect(diagramGridIndex('FF', 'up')).toBe('FS')
    expect(diagramGridIndex('FF', 'right')).toBe('SF')
    expect(diagramGridIndex('FF', 'down')).toBeNull()
    expect(diagramGridIndex('FF', 'left')).toBeNull()
  })

  it('navigates from SF', () => {
    expect(diagramGridIndex('SF', 'left')).toBe('FF')
    expect(diagramGridIndex('SF', 'up')).toBe('SS')
    expect(diagramGridIndex('SF', 'right')).toBeNull()
    expect(diagramGridIndex('SF', 'down')).toBeNull()
  })
})

describe('getDiagramSvgPaths', () => {
  it('returns exactly two rectangles (predecessor + successor) per kind', () => {
    for (const k of DIAGRAM_KINDS) {
      const paths = getDiagramSvgPaths(k)
      expect(paths.rects).toHaveLength(2)
      // Both rects have positive dimensions inside viewBox 80x50
      for (const r of paths.rects) {
        expect(r.w).toBeGreaterThan(0)
        expect(r.h).toBeGreaterThan(0)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(80)
        expect(r.y + r.h).toBeLessThanOrEqual(50)
      }
    }
  })

  it('returns an arrow polyline with at least two points per kind', () => {
    for (const k of DIAGRAM_KINDS) {
      const paths = getDiagramSvgPaths(k)
      const coords = paths.arrow.points.trim().split(/\s+/)
      expect(coords.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('FS arrow starts at the predecessor finish edge and ends at successor start edge', () => {
    const fs = getDiagramSvgPaths('FS')
    const [pred, succ] = fs.rects
    const coords = fs.arrow.points.trim().split(/\s+/).map((p) => p.split(',').map(Number))
    const first = coords[0]
    const last = coords[coords.length - 1]
    // Start ≈ right edge of predecessor (x ≈ pred.x + pred.w)
    expect(Math.abs(first[0] - (pred.x + pred.w))).toBeLessThanOrEqual(1)
    // End ≈ left edge of successor (x ≈ succ.x)
    expect(Math.abs(last[0] - succ.x)).toBeLessThanOrEqual(1)
  })

  it('SS arrow ends at the successor start (left) edge', () => {
    const ss = getDiagramSvgPaths('SS')
    const [pred, succ] = ss.rects
    const coords = ss.arrow.points.trim().split(/\s+/).map((p) => p.split(',').map(Number))
    const first = coords[0]
    const last = coords[coords.length - 1]
    // Both start (first) and end (last) align with left edges of predecessor / successor
    expect(Math.abs(first[0] - pred.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(last[0] - succ.x)).toBeLessThanOrEqual(2)
  })

  it('FF arrow ends at the successor finish (right) edge', () => {
    const ff = getDiagramSvgPaths('FF')
    const [pred, succ] = ff.rects
    const coords = ff.arrow.points.trim().split(/\s+/).map((p) => p.split(',').map(Number))
    const first = coords[0]
    const last = coords[coords.length - 1]
    // Start aligns with right edge of predecessor, end with right edge of successor
    expect(Math.abs(first[0] - (pred.x + pred.w))).toBeLessThanOrEqual(2)
    expect(Math.abs(last[0] - (succ.x + succ.w))).toBeLessThanOrEqual(2)
  })

  it('SF arrow starts at predecessor start (left) and ends at successor finish (right)', () => {
    const sf = getDiagramSvgPaths('SF')
    const [pred, succ] = sf.rects
    const coords = sf.arrow.points.trim().split(/\s+/).map((p) => p.split(',').map(Number))
    const first = coords[0]
    const last = coords[coords.length - 1]
    expect(Math.abs(first[0] - pred.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(last[0] - (succ.x + succ.w))).toBeLessThanOrEqual(2)
  })

  it('FS and FF have distinct arrow endpoints (left of S vs right of S)', () => {
    const fs = getDiagramSvgPaths('FS')
    const ff = getDiagramSvgPaths('FF')
    const fsLastX = Number(
      fs.arrow.points.trim().split(/\s+/).slice(-1)[0].split(',')[0]
    )
    const ffLastX = Number(
      ff.arrow.points.trim().split(/\s+/).slice(-1)[0].split(',')[0]
    )
    expect(fsLastX).not.toBe(ffLastX)
  })
})
