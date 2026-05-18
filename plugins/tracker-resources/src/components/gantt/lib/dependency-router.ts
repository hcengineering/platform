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
 * Spec §4: which end of which bar does the arrow attach to?
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
 *
 * Spec §4.
 */
export function bezierPath (p1: Point, p2: Point): string {
  const dx = Math.abs(p2.x - p1.x)
  const offset = Math.max(40, dx / 2)
  const c1x = p1.x + offset
  const c2x = p2.x - offset
  return `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`
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
  const len = Math.sqrt(tx * tx + ty * ty) || 1
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
 * Hover-emphasize set: which bars + arrows should stay at full opacity.
 * When the user hovers an issue bar, the bar itself plus its direct
 * predecessors and successors get highlighted. When the user hovers an
 * arrow (edge), only the two endpoints highlight — sibling edges of those
 * endpoints stay dimmed.
 *
 * Spec §3 (hover-emphasize wiring). Pure helper called from GanttView's
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
