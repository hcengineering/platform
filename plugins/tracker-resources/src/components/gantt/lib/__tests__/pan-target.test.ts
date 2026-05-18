//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { shouldPromoteCanvasPan, shouldStartCanvasPan } from '../pan-target'

function targetWithClosest (matches: Set<string>): Pick<Element, 'closest'> {
  return {
    closest: (selector: string) => {
      for (const part of selector.split(',').map((s) => s.trim())) {
        if (matches.has(part)) return {} as Element
      }
      return null
    }
  }
}

describe('pan-target', () => {
  it('allows panning from normal gantt bars', () => {
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['.bar-wrap'])))).toBe(true)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['rect.bar'])))).toBe(true)
  })

  it('keeps explicit controls out of canvas panning', () => {
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['button'])))).toBe(false)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['.resize-cell'])))).toBe(false)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['.drag-grip'])))).toBe(false)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['rect.bar.selected'])))).toBe(false)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['.summary-hit.selected'])))).toBe(false)
    expect(shouldStartCanvasPan(targetWithClosest(new Set(['.bar-resize-handle'])))).toBe(false)
  })

  it('promotes click-and-hold to pan only after real pointer movement', () => {
    expect(shouldPromoteCanvasPan(0, 0)).toBe(false)
    expect(shouldPromoteCanvasPan(2, 3)).toBe(false)
    expect(shouldPromoteCanvasPan(4, 0)).toBe(true)
    expect(shouldPromoteCanvasPan(0, -4)).toBe(true)
  })
})
