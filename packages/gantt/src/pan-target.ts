//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Elements that own an explicit interaction and must not start the canvas-pan
 * gesture. Unselected Gantt bars are intentionally not excluded: a short click
 * selects the bar, while click-and-hold/drag on that same unselected bar pans
 * the timeline just like dragging on empty canvas. Once selected, the bar body
 * and resize handles become explicit edit controls and are excluded.
 */
export const PAN_EXCLUDED_SELECTOR = [
  '.sidebar-cell',
  '.drag-grip',
  'button',
  'a',
  '.toggle-btn',
  '.jump-btn',
  '.resize-cell',
  '.gantt-connector-dot',
  'rect.bar.selected',
  '.summary-hit.selected',
  '.bar-resize-handle'
].join(', ')

export function shouldStartCanvasPan (target: Pick<Element, 'closest'> | null): boolean {
  if (target === null) return false
  return target.closest(PAN_EXCLUDED_SELECTOR) === null
}

export function shouldPromoteCanvasPan (dx: number, dy: number, threshold = 3): boolean {
  return Math.abs(dx) > threshold || Math.abs(dy) > threshold
}
