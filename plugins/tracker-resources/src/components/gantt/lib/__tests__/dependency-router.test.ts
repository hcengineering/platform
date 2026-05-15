//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DependencyKind } from '@hcengineering/tracker'
import { anchorOf, endpointPx, type BarRect } from '../dependency-router'
import { bezierPath, pathMidpoint, arrowheadPoints } from '../dependency-router'

describe('anchorOf', () => {
  it.each<[DependencyKind, 'finish' | 'start', 'finish' | 'start']>([
    ['finish-to-start', 'finish', 'start'],
    ['start-to-start', 'start', 'start'],
    ['finish-to-finish', 'finish', 'finish'],
    ['start-to-finish', 'start', 'finish']
  ])('kind=%s → source=%s, target=%s', (kind, sourceA, targetA) => {
    expect(anchorOf(kind, 'source')).toBe(sourceA)
    expect(anchorOf(kind, 'target')).toBe(targetA)
  })
})

describe('endpointPx', () => {
  const bar: BarRect = { left: 100, top: 40, right: 220, bottom: 60 }
  it('start anchor returns the left edge midpoint', () => {
    expect(endpointPx(bar, 'start')).toEqual({ x: 100, y: 50 })
  })
  it('finish anchor returns the right edge midpoint', () => {
    expect(endpointPx(bar, 'finish')).toEqual({ x: 220, y: 50 })
  })
})

describe('bezierPath', () => {
  it('emits a valid M x y C cx1 cy1, cx2 cy2, x y string', () => {
    const path = bezierPath({ x: 100, y: 50 }, { x: 300, y: 120 })
    expect(path).toMatch(/^M 100 50 C \d+ 50, \d+ 120, 300 120$/)
  })

  it('control-point horizontal offset clamps to 40px minimum', () => {
    // Short horizontal distance → offset would be < 40px without clamp.
    const path = bezierPath({ x: 100, y: 50 }, { x: 130, y: 80 })
    // c1.x = 100 + 40 = 140; c2.x = 130 - 40 = 90
    expect(path).toBe('M 100 50 C 140 50, 90 80, 130 80')
  })

  it('uses |dx|/2 when that exceeds the 40px floor', () => {
    // |dx| = 200 → offset = 100; c1.x = 100 + 100 = 200; c2.x = 300 - 100 = 200
    const path = bezierPath({ x: 100, y: 50 }, { x: 300, y: 80 })
    expect(path).toBe('M 100 50 C 200 50, 200 80, 300 80')
  })
})

describe('pathMidpoint', () => {
  it('returns the de Casteljau midpoint at t=0.5 for a known curve', () => {
    // p1 = (0,0), p2 = (200, 0). c1 = (100, 0), c2 = (100, 0).
    // B(0.5) = 0.125*p1 + 0.375*c1 + 0.375*c2 + 0.125*p2
    // x = 0.125*0 + 0.375*100 + 0.375*100 + 0.125*200 = 0 + 37.5 + 37.5 + 25 = 100
    const mid = pathMidpoint({ x: 0, y: 0 }, { x: 200, y: 0 })
    expect(mid).toEqual({ x: 100, y: 0 })
  })

  it('reflects vertical offset symmetrically', () => {
    // p1 = (100, 50), p2 = (100, 150). |dx| = 0 → offset = 40.
    // c1 = (140, 50), c2 = (60, 150).
    // B(0.5).x = 0.125*100 + 0.375*140 + 0.375*60 + 0.125*100 = 12.5 + 52.5 + 22.5 + 12.5 = 100
    // B(0.5).y = 0.125*50 + 0.375*50 + 0.375*150 + 0.125*150 = 6.25 + 18.75 + 56.25 + 18.75 = 100
    const mid = pathMidpoint({ x: 100, y: 50 }, { x: 100, y: 150 })
    expect(mid).toEqual({ x: 100, y: 100 })
  })
})

describe('arrowheadPoints', () => {
  it('returns 3 points forming a triangle pointing at p2 along the tangent', () => {
    // p1 = (0,0), p2 = (100, 0). c2 = (60, 0). Tangent dir is (1,0).
    // Tip is at p2 = (100, 0); base is 8px behind p2 along the tangent.
    const tri = arrowheadPoints({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(tri.length).toBe(3)
    expect(tri[0]).toEqual({ x: 100, y: 0 })
    expect(tri[1].x).toBeCloseTo(92, 1)
    expect(tri[2].x).toBeCloseTo(92, 1)
    expect(Math.abs(tri[1].y - tri[2].y)).toBeCloseTo(8, 1)
  })
})
