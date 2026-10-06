// SPDX-License-Identifier: EPL-2.0

import { pageTimeline } from '../timeline-navigation'

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
