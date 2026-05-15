//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Helpers for the Visual DependencyEditor (Tier-4 #11).
 *
 * The picker shows four mini SVG diagrams in a 2×2 grid:
 *
 *   FS   SS
 *   FF   SF
 *
 * Each diagram visualises one of the four `DependencyKind` codes via two
 * rectangles (predecessor `P` and successor `S`) plus an arrow connecting
 * the correct endpoints. Layout, grid-navigation, and the SVG coordinate
 * data live here as pure functions so they can be unit-tested without
 * Svelte. See spec §SVG-Diagramm-Specs and §UI/UX-Verhalten.
 */

export type DiagramKindCode = 'FS' | 'SS' | 'FF' | 'SF'

/**
 * Order of the four mini-diagrams. Index 0..3 maps to grid row-major:
 * 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right. The grid is
 * defined so FS↔SS share a row (both "*-to-Start") and FF↔SF share a row
 * (both terminate on the successor's later edge). Symmetry between
 * top/bottom matches the spec.
 */
export const DIAGRAM_KINDS: readonly DiagramKindCode[] = ['FS', 'SS', 'FF', 'SF'] as const

const GRID_ROW: Record<DiagramKindCode, 0 | 1> = { FS: 0, SS: 0, FF: 1, SF: 1 }
const GRID_COL: Record<DiagramKindCode, 0 | 1> = { FS: 0, SS: 1, FF: 0, SF: 1 }

/**
 * Keyboard navigation between mini-diagrams in the 2×2 grid. Returns the
 * neighbouring kind for the given direction or `null` if the move would
 * leave the grid (i.e. arrow-up on FS).
 */
export function diagramGridIndex (
  from: DiagramKindCode,
  dir: 'up' | 'down' | 'left' | 'right'
): DiagramKindCode | null {
  let row: number = GRID_ROW[from]
  let col: number = GRID_COL[from]
  if (dir === 'up') row -= 1
  else if (dir === 'down') row += 1
  else if (dir === 'left') col -= 1
  else col += 1
  if (row < 0 || row > 1 || col < 0 || col > 1) return null
  for (const k of DIAGRAM_KINDS) {
    if (GRID_ROW[k] === row && GRID_COL[k] === col) return k
  }
  return null
}

/**
 * Clamp + round a slider value. The slider range is -14..+14 days (UX
 * comfort zone), but the underlying NumberInput in `DependencyEditor`
 * still supports the full storage range -30..+90 — that wider clamp is
 * applied separately on save in DependencyEditor.svelte.
 */
export function clampLagSlider (
  n: number,
  sliderMin: number = -14,
  sliderMax: number = 14
): number {
  if (Number.isNaN(n)) return 0
  const r = Math.round(n)
  if (r < sliderMin) return sliderMin
  if (r > sliderMax) return sliderMax
  return r
}

export interface DiagramRect {
  x: number
  y: number
  w: number
  h: number
}

export interface DiagramArrow {
  /** Polyline points, formatted as "x1,y1 x2,y2 x3,y3" (space-separated). */
  points: string
}

export interface DiagramSvgPaths {
  /** Exactly two rectangles: [predecessor, successor]. */
  rects: [DiagramRect, DiagramRect]
  arrow: DiagramArrow
}

/**
 * SVG geometry for the four mini-diagrams. ViewBox is 80×50. Each rect is
 * 22×12. Predecessor sits top-left-ish, successor bottom-right-ish (or
 * stacked vertically for SS/FF). Arrow polyline connects the correct
 * endpoints per kind:
 *
 *   FS: pred.right → succ.left (offset/elbow)
 *   SS: pred.left  → succ.left (vertical bridge on the left)
 *   FF: pred.right → succ.right (vertical bridge on the right)
 *   SF: pred.left  → succ.right (long diagonal elbow — rarely used)
 */
export function getDiagramSvgPaths (kind: DiagramKindCode): DiagramSvgPaths {
  // Common rect dimensions; predecessor + successor are positioned per kind.
  const W = 22
  const H = 12
  // FS / SF use a horizontal-offset layout (pred top-left, succ bottom-right);
  // SS / FF use a vertical-stack layout where both rects share the left edge.
  if (kind === 'FS') {
    const pred: DiagramRect = { x: 6, y: 10, w: W, h: H }
    const succ: DiagramRect = { x: 52, y: 28, w: W, h: H }
    const startX = pred.x + pred.w // right edge of pred
    const startY = pred.y + pred.h / 2
    const endX = succ.x // left edge of succ
    const endY = succ.y + succ.h / 2
    const midX = (startX + endX) / 2
    return {
      rects: [pred, succ],
      arrow: { points: `${startX},${startY} ${midX},${startY} ${midX},${endY} ${endX},${endY}` }
    }
  }
  if (kind === 'SS') {
    const pred: DiagramRect = { x: 28, y: 8, w: W, h: H }
    const succ: DiagramRect = { x: 28, y: 30, w: W, h: H }
    const startX = pred.x // left edge of pred
    const startY = pred.y + pred.h
    const elbowX = pred.x - 8
    const endX = succ.x // left edge of succ
    const endY = succ.y + succ.h / 2
    return {
      rects: [pred, succ],
      arrow: { points: `${startX},${startY} ${elbowX},${startY} ${elbowX},${endY} ${endX},${endY}` }
    }
  }
  if (kind === 'FF') {
    const pred: DiagramRect = { x: 28, y: 8, w: W, h: H }
    const succ: DiagramRect = { x: 28, y: 30, w: W, h: H }
    const startX = pred.x + pred.w // right edge of pred
    const startY = pred.y + pred.h
    const elbowX = pred.x + pred.w + 8
    const endX = succ.x + succ.w // right edge of succ
    const endY = succ.y + succ.h / 2
    return {
      rects: [pred, succ],
      arrow: { points: `${startX},${startY} ${elbowX},${startY} ${elbowX},${endY} ${endX},${endY}` }
    }
  }
  // SF: pred.left → succ.right (least common kind)
  const pred: DiagramRect = { x: 6, y: 10, w: W, h: H }
  const succ: DiagramRect = { x: 52, y: 28, w: W, h: H }
  const startX = pred.x
  const startY = pred.y + pred.h / 2
  const aboveY = pred.y - 4
  const endX = succ.x + succ.w
  const endY = succ.y + succ.h / 2
  return {
    rects: [pred, succ],
    arrow: { points: `${startX},${startY} ${startX - 4},${startY} ${startX - 4},${aboveY} ${endX + 4},${aboveY} ${endX + 4},${endY} ${endX},${endY}` }
  }
}
