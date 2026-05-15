//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Elements that own an explicit interaction and must not start the canvas-pan
 * gesture. Normal Gantt bars are intentionally not excluded: a short click on
 * a bar selects it, while click-and-hold/drag on the same bar pans the
 * timeline just like dragging on empty canvas.
 */
export const PAN_EXCLUDED_SELECTOR = [
  '.sidebar-cell',
  '.drag-grip',
  'button',
  'a',
  '.toggle-btn',
  '.jump-btn',
  '.resize-cell',
  '.gantt-connector-dot'
].join(', ')

export function shouldStartCanvasPan (target: Pick<Element, 'closest'> | null): boolean {
  if (target === null) return false
  return target.closest(PAN_EXCLUDED_SELECTOR) === null
}

export function shouldPromoteCanvasPan (dx: number, dy: number, threshold = 3): boolean {
  return Math.abs(dx) > threshold || Math.abs(dy) > threshold
}
