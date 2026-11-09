//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DependencyKind, Issue, IssueRelation } from '@hcengineering/tracker'
import {
  anchorOf,
  endpointPx,
  bezierPath,
  bezierHitPath,
  ARROW_HIT_CLEARANCE_PX,
  pathMidpoint,
  arrowheadPoints,
  connectedIssueIds,
  classifyArrowVisibility,
  clippedEndpointPx,
  type BarRect,
  type YBounds
} from '../dependency-router'
import type { Ref } from '@hcengineering/core'

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

function mkRel (from: string, to: string): IssueRelation {
  return {
    _id: `${from}->${to}` as Ref<IssueRelation>,
    attachedTo: from as Ref<Issue>,
    target: to as Ref<Issue>,
    kind: 'finish-to-start',
    lag: 0,
    space: 'sp' as IssueRelation['space']
  } as unknown as IssueRelation
}

describe('connectedIssueIds', () => {
  const A = 'A' as Ref<Issue>
  const B = 'B' as Ref<Issue>
  const D = 'D' as Ref<Issue>

  it('returns empty set when nothing is hovered', () => {
    const s = connectedIssueIds(null, null, [mkRel('A', 'B')])
    expect(s.size).toBe(0)
  })

  it('hoveredIssue alone returns issue + its direct neighbors', () => {
    const s = connectedIssueIds(B, null, [mkRel('A', 'B'), mkRel('B', 'C')])
    expect([...s].sort()).toEqual(['A', 'B', 'C'])
  })

  it('isolated hover (no relations) returns just the issue itself', () => {
    const s = connectedIssueIds(A, null, [mkRel('B', 'C')])
    expect([...s]).toEqual(['A'])
  })

  it('hoveredEdge returns both endpoints (no neighbor expansion on edges)', () => {
    const s = connectedIssueIds(null, { source: A, target: B }, [mkRel('A', 'B'), mkRel('B', 'C')])
    expect([...s].sort()).toEqual(['A', 'B'])
  })

  it('hoveredIssue + hoveredEdge combine into the same set', () => {
    const s = connectedIssueIds(B, { source: A, target: B }, [mkRel('A', 'B'), mkRel('B', 'C')])
    expect([...s].sort()).toEqual(['A', 'B', 'C'])
  })

  it('ignores unrelated issues', () => {
    const s = connectedIssueIds(A, null, [mkRel('A', 'B'), mkRel('B', 'C'), mkRel('D', 'D')])
    expect(s.has(D)).toBe(false)
  })
})

describe('classifyArrowVisibility', () => {
  const bounds: YBounds = { top: 100, bottom: 500 }
  const barIn1: BarRect = { left: 50, top: 110, right: 80, bottom: 130 }
  const barIn2: BarRect = { left: 200, top: 200, right: 240, bottom: 220 }
  const barAbove: BarRect = { left: 90, top: 0, right: 120, bottom: 20 }
  const barBelow: BarRect = { left: 90, top: 600, right: 120, bottom: 620 }

  it('both endpoints inside → both-visible', () => {
    expect(classifyArrowVisibility(barIn1, barIn2, bounds)).toEqual({ kind: 'both-visible' })
  })

  it('source in, target below → source-only with targetEdge=bottom', () => {
    expect(classifyArrowVisibility(barIn1, barBelow, bounds)).toEqual({
      kind: 'source-only',
      targetEdge: 'bottom'
    })
  })

  it('source in, target above → source-only with targetEdge=top', () => {
    expect(classifyArrowVisibility(barIn1, barAbove, bounds)).toEqual({
      kind: 'source-only',
      targetEdge: 'top'
    })
  })

  it('source above, target in → target-only with sourceEdge=top', () => {
    expect(classifyArrowVisibility(barAbove, barIn2, bounds)).toEqual({
      kind: 'target-only',
      sourceEdge: 'top'
    })
  })

  it('source below, target in → target-only with sourceEdge=bottom', () => {
    expect(classifyArrowVisibility(barBelow, barIn2, bounds)).toEqual({
      kind: 'target-only',
      sourceEdge: 'bottom'
    })
  })

  it('source above, target below → both-off crossing viewport', () => {
    expect(classifyArrowVisibility(barAbove, barBelow, bounds)).toEqual({
      kind: 'both-off',
      sourceEdge: 'top',
      targetEdge: 'bottom'
    })
  })

  it('both below viewport → none (no crossing)', () => {
    const barBelow2: BarRect = { left: 200, top: 700, right: 230, bottom: 720 }
    expect(classifyArrowVisibility(barBelow, barBelow2, bounds)).toEqual({ kind: 'none' })
  })

  it('both above viewport → none (no crossing)', () => {
    const barAbove2: BarRect = { left: 200, top: 30, right: 230, bottom: 50 }
    expect(classifyArrowVisibility(barAbove, barAbove2, bounds)).toEqual({ kind: 'none' })
  })

  it('null source → none', () => {
    expect(classifyArrowVisibility(null, barIn1, bounds)).toEqual({ kind: 'none' })
  })

  it('null target → none', () => {
    expect(classifyArrowVisibility(barIn1, null, bounds)).toEqual({ kind: 'none' })
  })

  it('bar straddling top edge counts as visible', () => {
    const straddle: BarRect = { left: 50, top: 80, right: 80, bottom: 120 }
    expect(classifyArrowVisibility(straddle, barIn2, bounds)).toEqual({ kind: 'both-visible' })
  })

  it('bar straddling bottom edge counts as visible', () => {
    const straddle: BarRect = { left: 50, top: 480, right: 80, bottom: 520 }
    expect(classifyArrowVisibility(straddle, barIn2, bounds)).toEqual({ kind: 'both-visible' })
  })
})

describe('clippedEndpointPx', () => {
  const bounds: YBounds = { top: 100, bottom: 500 }
  const bar: BarRect = { left: 80, top: 600, right: 140, bottom: 620 }

  it('start anchor + bottom edge → (bar.left, bounds.bottom)', () => {
    expect(clippedEndpointPx(bar, 'start', bounds, 'bottom')).toEqual({ x: 80, y: 500 })
  })

  it('finish anchor + bottom edge → (bar.right, bounds.bottom)', () => {
    expect(clippedEndpointPx(bar, 'finish', bounds, 'bottom')).toEqual({ x: 140, y: 500 })
  })

  it('start anchor + top edge → (bar.left, bounds.top)', () => {
    expect(clippedEndpointPx(bar, 'start', bounds, 'top')).toEqual({ x: 80, y: 100 })
  })
})

describe('bezierHitPath', () => {
  /** Parse `M x y C c1x c1y, c2x c2y, x2 y2` back into numbers. */
  function parse (d: string): number[] {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)
    expect(nums).not.toBeNull()
    return (nums as string[]).map(Number)
  }

  it('keeps both endpoints clear of the bar edges they are anchored to', () => {
    const p1 = { x: 220, y: 50 }
    const p2 = { x: 400, y: 150 }
    const [sx, sy, , , , , ex, ey] = parse(bezierHitPath(p1, p2))
    // Both trimmed endpoints must be further from the anchor than the 3px
    // resize-handle overhang — that is the whole point of the trim.
    expect(Math.hypot(sx - p1.x, sy - p1.y)).toBeGreaterThan(3)
    expect(Math.hypot(ex - p2.x, ey - p2.y)).toBeGreaterThan(3)
    // …and it must not eat the whole curve either.
    expect(Math.hypot(ex - sx, ey - sy)).toBeGreaterThan(20)
  })

  it('starts to the right of the source and ends to the left of the target', () => {
    // Control points always point outward horizontally, so the trimmed ends
    // move INTO the curve, never past the opposite endpoint.
    const p1 = { x: 100, y: 10 }
    const p2 = { x: 500, y: 90 }
    const [sx, , , , , , ex] = parse(bezierHitPath(p1, p2))
    expect(sx).toBeGreaterThan(p1.x)
    expect(ex).toBeLessThan(p2.x)
  })

  it('degenerates to a usable middle segment for a zero-length curve', () => {
    const p = { x: 200, y: 200 }
    const d = bezierHitPath(p, p, 10_000)
    expect(d.startsWith('M ')).toBe(true)
    expect(parse(d)).toHaveLength(8)
  })

  it('trims more when a larger clearance is requested', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 300, y: 0 }
    const [small] = parse(bezierHitPath(p1, p2, 5))
    const [large] = parse(bezierHitPath(p1, p2, 25))
    expect(large).toBeGreaterThan(small)
  })

  it('exposes a clearance default that covers the 3px resize-handle overhang', () => {
    expect(ARROW_HIT_CLEARANCE_PX).toBeGreaterThan(3)
  })

  it('leaves the rendered curve untouched', () => {
    const p1 = { x: 10, y: 20 }
    const p2 = { x: 210, y: 60 }
    expect(bezierPath(p1, p2)).toBe('M 10 20 C 110 20, 110 60, 210 60')
  })
})
