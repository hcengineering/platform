//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

export function computeCanvasViewportWidth (
  scrollerClientWidth: number,
  sidebarWidth: number,
  resizeCellWidth: number
): number {
  return Math.max(1, scrollerClientWidth - sidebarWidth - resizeCellWidth)
}

export function computeCanvasRenderWidth (
  dataRangeWidth: number,
  viewportWidth: number
): number {
  return Math.max(1, dataRangeWidth, viewportWidth)
}

export function computeAdaptivePxPerDay (
  basePxPerDay: number,
  dataRangeWidth: number,
  viewportWidth: number
): number {
  if (basePxPerDay <= 0 || dataRangeWidth <= 0 || viewportWidth <= 0) return basePxPerDay
  if (dataRangeWidth >= viewportWidth) return basePxPerDay
  return basePxPerDay * (viewportWidth / dataRangeWidth)
}

export function computeTickViewport (
  viewportLeft: number,
  viewportRight: number,
  dataRangeWidth: number,
  overscan: number = 100
): { left: number, right: number } {
  const maxRight = Math.max(1, dataRangeWidth)
  return {
    left: Math.min(Math.max(0, viewportLeft - overscan), maxRight),
    right: Math.min(Math.max(0, viewportRight + overscan), maxRight)
  }
}
