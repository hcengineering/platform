// SPDX-License-Identifier: EPL-2.0

export interface TimelinePage {
  scrollLeft: number
  offsetDays: number
}

/** Continue paging beyond the data extent, including a timeline without overflow. */
export function pageTimeline (
  direction: -1 | 1,
  scrollLeft: number,
  viewportWidth: number,
  maxScroll: number,
  pxPerDay: number,
  offsetDays: number
): TimelinePage {
  if (viewportWidth <= 0 || pxPerDay <= 0) return { scrollLeft, offsetDays }
  const step = direction * viewportWidth * 0.8
  const target = scrollLeft + step
  if (target < 0 || target > maxScroll) return { scrollLeft, offsetDays: offsetDays + step / pxPerDay }
  return { scrollLeft: target, offsetDays }
}

/** Restore the shifted window before converting a saved left-edge date to pixels. */
export function restorePanOffsetDays (anchor: number, savedOffset: unknown, baseFrom: number, baseTo: number): number {
  const dayMs = 86_400_000
  const offset = typeof savedOffset === 'number' && Number.isFinite(savedOffset) ? savedOffset : 0
  if (anchor >= baseFrom + offset * dayMs && anchor <= baseTo + offset * dayMs) return offset
  // Older views have no offset; a changed issue range can invalidate one.
  return (anchor - (baseFrom + baseTo) / 2) / dayMs
}

/** Keep the offset only while the saved time window is pinned. */
export function withPinnedPanOffset (
  options: Record<string, unknown>,
  pinned: boolean,
  offsetDays: number
): Record<string, unknown> {
  const result = { ...options }
  if (pinned) result.ganttPanOffsetDays = offsetDays
  else delete result.ganttPanOffsetDays
  return result
}
