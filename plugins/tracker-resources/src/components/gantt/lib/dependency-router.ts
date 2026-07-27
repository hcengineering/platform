//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DependencyKind, Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

/**
 * Bar geometry in canvas-pixel coordinates. `top`/`bottom` are the SVG y
 * range; `left`/`right` are the SVG x range. The dependency-arrow router
 * only needs the four corners — it does not care about the bar's status
 * fill, label, or selection state.
 */
export interface BarRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Point {
  x: number
  y: number
}

export type Anchor = 'start' | 'finish'

/**
 * Which end of which bar does the arrow attach to?
 *
 *   FS — source finish → target start (default; most common scheduling rel)
 *   SS — source start  → target start
 *   FF — source finish → target finish
 *   SF — source start  → target finish (rare; "as-late-as-possible" cases)
 */
export function anchorOf (kind: DependencyKind, end: 'source' | 'target'): Anchor {
  switch (kind) {
    case 'finish-to-start':
      return end === 'source' ? 'finish' : 'start'
    case 'start-to-start':
      return 'start'
    case 'finish-to-finish':
      return 'finish'
    case 'start-to-finish':
      return end === 'source' ? 'start' : 'finish'
  }
}

/**
 * Pixel coordinates of a bar's start- or finish-edge midpoint.
 * `'start'` → left edge, vertical center. `'finish'` → right edge, vertical
 * center. Used by both the arrow-router (renders a bezier) and the
 * connector-dot (anchored on the source bar's right edge).
 */
export function endpointPx (bar: BarRect, anchor: Anchor): Point {
  const x = anchor === 'start' ? bar.left : bar.right
  const y = (bar.top + bar.bottom) / 2
  return { x, y }
}

/**
 * Cubic Bezier path from p1 to p2 with horizontal-then-vertical control
 * points. Both control points sit on the same y as their endpoint so the
 * curve leaves p1 horizontally and arrives at p2 horizontally — even when
 * the two bars are on different rows.
 *
 * Offset = max(40px, |dx|/2). The 40px floor stops curves between nearby
 * bars from collapsing to nearly straight lines; the |dx|/2 term keeps
 * longer-distance curves visually balanced (control points at 1/4 and 3/4
 * of the horizontal span).
 */
export function bezierPath (p1: Point, p2: Point): string {
  const dx = Math.abs(p2.x - p1.x)
  const offset = Math.max(40, dx / 2)
  const c1x = p1.x + offset
  const c2x = p2.x - offset
  return `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`
}

/**
 * Clearance (px) kept free of the arrow's invisible click-target at BOTH
 * ends of the curve.
 *
 * The bar resize handles are 6 px wide rects centred on the bar edge
 * (`x - 3 .. x + 3`, see GanttBar.svelte) and every dependency endpoint sits
 * on a bar edge by definition. The arrow's hit-stroke is 12 px wide and the
 * dependency layer paints AFTER the bars, so an untrimmed hit-stroke covered
 * both handles of every bar that has a dependency and made them unclickable.
 * 10 px clears the 3 px handle overhang with room to spare while leaving the
 * bulk of the curve — and the lag pill at its midpoint — clickable.
 */
export const ARROW_HIT_CLEARANCE_PX = 10

interface Cubic {
  p0: Point
  c1: Point
  c2: Point
  p3: Point
}

function lerp (a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** de Casteljau split; returns the sub-curve on `[0, t]`. */
function cubicLeft (c: Cubic, t: number): Cubic {
  const a = lerp(c.p0, c.c1, t)
  const b = lerp(c.c1, c.c2, t)
  const d = lerp(c.c2, c.p3, t)
  const e = lerp(a, b, t)
  const f = lerp(b, d, t)
  const g = lerp(e, f, t)
  return { p0: c.p0, c1: a, c2: e, p3: g }
}

/** de Casteljau split; returns the sub-curve on `[t, 1]`. */
function cubicRight (c: Cubic, t: number): Cubic {
  const a = lerp(c.p0, c.c1, t)
  const b = lerp(c.c1, c.c2, t)
  const d = lerp(c.c2, c.p3, t)
  const e = lerp(a, b, t)
  const f = lerp(b, d, t)
  const g = lerp(e, f, t)
  return { p0: g, c1: f, c2: d, p3: c.p3 }
}

function controlPointsOf (p1: Point, p2: Point): Cubic {
  const dx = Math.abs(p2.x - p1.x)
  const offset = Math.max(40, dx / 2)
  return { p0: p1, c1: { x: p1.x + offset, y: p1.y }, c2: { x: p2.x - offset, y: p2.y }, p3: p2 }
}

/**
 * Same curve as {@link bezierPath}, but with `clearance` pixels cut off each
 * end — used for the arrow's invisible click-target so it cannot steal
 * pointer events from the resize handles that live on the bar edges the
 * curve is anchored to.
 *
 * The cut parameter is derived from the control-polygon length, an upper
 * bound on the true arc length, so the trimmed-off piece approximates
 * `clearance` from below (≈ 8–10 px for the geometry `bezierPath` produces,
 * because the curve leaves each endpoint at speed `3 * offset` and `offset`
 * is at least 40). That is comfortably more than the 3 px the resize handles
 * stick out past the bar edge, which is the property that matters — an exact
 * arc-length parameterisation would buy nothing here. Both cut points are
 * clamped so a degenerate short curve keeps a usable middle segment instead
 * of collapsing to nothing.
 */
export function bezierHitPath (p1: Point, p2: Point, clearance: number = ARROW_HIT_CLEARANCE_PX): string {
  const c = controlPointsOf(p1, p2)
  const polyLen =
    Math.hypot(c.c1.x - c.p0.x, c.c1.y - c.p0.y) +
    Math.hypot(c.c2.x - c.c1.x, c.c2.y - c.c1.y) +
    Math.hypot(c.p3.x - c.c2.x, c.p3.y - c.c2.y)
  const raw = polyLen > 0 ? clearance / polyLen : 0
  // Never eat more than the outer 40% per side — a degenerate short curve
  // must still expose a clickable middle.
  const t0 = Math.min(Math.max(raw, 0), 0.4)
  const t1 = 1 - t0
  const middle = cubicRight(cubicLeft(c, t1), t0 / t1)
  return `M ${middle.p0.x} ${middle.p0.y} C ${middle.c1.x} ${middle.c1.y}, ${middle.c2.x} ${middle.c2.y}, ${middle.p3.x} ${middle.p3.y}`
}

/**
 * Point on the cubic Bezier at t=0.5 — used to pin the lag-pill at the
 * curve's visual centre. Closed-form de Casteljau:
 *   B(0.5) = 0.125*p1 + 0.375*c1 + 0.375*c2 + 0.125*p2
 * Same control-point convention as bezierPath().
 */
export function pathMidpoint (p1: Point, p2: Point): Point {
  const dx = Math.abs(p2.x - p1.x)
  const offset = Math.max(40, dx / 2)
  const c1 = { x: p1.x + offset, y: p1.y }
  const c2 = { x: p2.x - offset, y: p2.y }
  return {
    x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
    y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y
  }
}

/**
 * Three triangle vertices for an arrowhead at p2, oriented along the
 * tangent at the curve endpoint. With our control-point convention,
 * the tangent at p2 is parallel to (p2 - c2). 8px tip-to-base, 8px wide.
 */
export function arrowheadPoints (p1: Point, p2: Point): [Point, Point, Point] {
  const dx = Math.abs(p2.x - p1.x)
  const offset = Math.max(40, dx / 2)
  const c2 = { x: p2.x - offset, y: p2.y }
  const tx = p2.x - c2.x
  const ty = p2.y - c2.y
  const rawLen = Math.sqrt(tx * tx + ty * ty)
  const len = rawLen > 0 ? rawLen : 1
  const ux = tx / len
  const uy = ty / len
  const baseX = p2.x - 8 * ux
  const baseY = p2.y - 8 * uy
  const v1x = baseX + 4 * -uy
  const v1y = baseY + 4 * ux
  const v2x = baseX - 4 * -uy
  const v2y = baseY - 4 * ux
  return [
    { x: p2.x, y: p2.y },
    { x: v1x, y: v1y },
    { x: v2x, y: v2y }
  ]
}

/**
 * Y-axis viewport bounds in canvas coordinate space. Used
 * by {@link classifyArrowVisibility} to decide whether a dependency arrow's
 * source / target endpoint is on-screen. Same coordinate space as `BarRect`.
 */
export interface YBounds {
  top: number
  bottom: number
}

/** Possible visibility states of a dependency arrow against the y-viewport. */
export type ArrowVisibility =
  | { kind: 'both-visible' }
  | { kind: 'source-only', targetEdge: 'top' | 'bottom' }
  | { kind: 'target-only', sourceEdge: 'top' | 'bottom' }
  | { kind: 'both-off', sourceEdge: 'top' | 'bottom', targetEdge: 'top' | 'bottom' }
  | { kind: 'none' }

/**
 * Decide which sides of a dependency arrow are on-screen vs clipped to the
 * y-viewport edge. A bar is considered "visible" when any pixel of its
 * vertical range `[top, bottom)` overlaps `bounds`. Both bars below or both
 * above is `'none'` — the arrow doesn't cross the visible band. Both
 * endpoints off but on opposite sides (`both-off` with opposite edges)
 * means the arrow path crosses the viewport vertically and must still be
 * drawn (clipped to the top + bottom edges).
 */
export function classifyArrowVisibility (
  source: BarRect | null,
  target: BarRect | null,
  bounds: YBounds
): ArrowVisibility {
  if (source === null || target === null) return { kind: 'none' }

  const sourceVisible = source.bottom > bounds.top && source.top < bounds.bottom
  const targetVisible = target.bottom > bounds.top && target.top < bounds.bottom

  if (sourceVisible && targetVisible) return { kind: 'both-visible' }

  const edgeOf = (bar: BarRect): 'top' | 'bottom' => (bar.top >= bounds.bottom ? 'bottom' : 'top')

  if (sourceVisible) {
    return { kind: 'source-only', targetEdge: edgeOf(target) }
  }
  if (targetVisible) {
    return { kind: 'target-only', sourceEdge: edgeOf(source) }
  }

  // Both off — but on the same side both above / both below → no crossing.
  const sourceEdge = edgeOf(source)
  const targetEdge = edgeOf(target)
  if (sourceEdge === targetEdge) return { kind: 'none' }

  return { kind: 'both-off', sourceEdge, targetEdge }
}

/**
 * Compute the synthetic endpoint to use when one end of a dependency arrow
 * lives off-screen. The endpoint sits on the viewport edge (top or bottom)
 * at the same horizontal x as the off-screen bar would have used. Caller
 * uses this to draw a bezier that ends at the viewport edge instead of at
 * the off-screen bar, with a small triangle indicator on top.
 */
export function clippedEndpointPx (bar: BarRect, anchor: Anchor, bounds: YBounds, offEdge: 'top' | 'bottom'): Point {
  const x = anchor === 'start' ? bar.left : bar.right
  const y = offEdge === 'top' ? bounds.top : bounds.bottom
  return { x, y }
}

/**
 * Hover-emphasize set: which bars + arrows should stay at full opacity.
 * When the user hovers an issue bar, the bar itself plus its direct
 * predecessors and successors get highlighted. When the user hovers an
 * arrow (edge), only the two endpoints highlight — sibling edges of those
 * endpoints stay dimmed.
 *
 * Pure helper called from GanttView's
 * reactive block; the result drives a `dimmed: boolean` prop on every
 * GanttBar and GanttDependencyArrow.
 */
export function connectedIssueIds (
  hoveredIssue: Ref<Issue> | null,
  hoveredEdge: { source: Ref<Issue>, target: Ref<Issue> } | null,
  relations: IssueRelation[]
): Set<Ref<Issue>> {
  const out = new Set<Ref<Issue>>()

  if (hoveredIssue !== null) {
    out.add(hoveredIssue)
    for (const r of relations) {
      if (r.attachedTo === hoveredIssue) out.add(r.target)
      if (r.target === hoveredIssue) out.add(r.attachedTo)
    }
  }

  if (hoveredEdge !== null) {
    out.add(hoveredEdge.source)
    out.add(hoveredEdge.target)
  }

  return out
}
