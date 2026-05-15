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
