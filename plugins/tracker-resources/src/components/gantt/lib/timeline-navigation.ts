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
