// SPDX-License-Identifier: EPL-2.0

import { pageTimeline, restorePanOffsetDays, withPinnedPanOffset } from '../timeline-navigation'

describe('timeline paging', () => {
  it('moves the time window in both directions without scroll overflow', () => {
    const next = pageTimeline(1, 0, 1000, 0, 20, 0)
    expect(next).toEqual({ scrollLeft: 0, offsetDays: 40 })
    expect(pageTimeline(-1, next.scrollLeft, 1000, 0, 20, next.offsetDays)).toEqual({ scrollLeft: 0, offsetDays: 0 })
  })

  it('scrolls within a larger timeline before moving its window', () => {
    expect(pageTimeline(1, 100, 500, 1000, 20, 0)).toEqual({ scrollLeft: 500, offsetDays: 0 })
    expect(pageTimeline(-1, 500, 500, 1000, 20, 0)).toEqual({ scrollLeft: 100, offsetDays: 0 })
  })

  it('continues past either boundary without resetting the current scroll', () => {
    expect(pageTimeline(1, 1000, 500, 1000, 20, 0)).toEqual({ scrollLeft: 1000, offsetDays: 20 })
    expect(pageTimeline(-1, 0, 500, 1000, 20, 0)).toEqual({ scrollLeft: 0, offsetDays: -20 })
  })

  it('does not change the window before viewport measurement', () => {
    expect(pageTimeline(1, 0, 0, 0, 20, 0)).toEqual({ scrollLeft: 0, offsetDays: 0 })
  })
})

describe('pinned timeline window', () => {
  const day = 86_400_000
  const from = Date.UTC(2026, 8, 1)
  const to = from + 30 * day

  it('keeps a saved offset when its anchor remains inside the shifted window', () => {
    expect(restorePanOffsetDays(from + 45 * day, 30, from, to)).toBe(30)
  })

  it('derives an offset for old views and changed issue ranges', () => {
    expect(restorePanOffsetDays(from + 45 * day, undefined, from, to)).toBe(30)
    expect(restorePanOffsetDays(from + 15 * day, 90, from, to)).toBe(0)
  })

  it('clears the offset when the fixed window is unchecked', () => {
    const pinned = withPinnedPanOffset({ ganttPanAnchorDate: '2026-09-15' }, true, 30)
    expect(pinned.ganttPanOffsetDays).toBe(30)
    const unpinned = withPinnedPanOffset({ ...pinned, ganttPanAnchorDate: undefined }, false, 0)
    expect(unpinned).not.toHaveProperty('ganttPanOffsetDays')
  })
})
