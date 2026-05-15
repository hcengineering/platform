//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { computeCascadeBodyHeight } from '../cascade-popup-layout'

const baseInput = {
  rowHeight: 22,
  barTopPadding: 32,
  bodyVerticalPadding: 8,
  bodyBottomSafety: 8,
  bodyMaxHeight: 360
}

describe('cascade-popup-layout: computeCascadeBodyHeight', () => {
  it('reserves padding + safety on top of the timeline content', () => {
    // 3 rows × 22 = 66 timeline + 32 header pad = 98 svg height. Plus
    // 8+8 = 16 padding/safety → 114. Crucially > 98 (the  bug
    // produced exactly 98 and clipped the last 8 px of the last row).
    expect(computeCascadeBodyHeight({ ...baseInput, rowCount: 3 })).toBe(114)
  })

  it('returns a single-row tall enough to show the bar plus padding', () => {
    expect(computeCascadeBodyHeight({ ...baseInput, rowCount: 1 })).toBe(70)
  })

  it('caps at bodyMaxHeight once content overflows', () => {
    // 100 rows × 22 + extras = 2248 → clamps to 360.
    expect(computeCascadeBodyHeight({ ...baseInput, rowCount: 100 })).toBe(360)
  })

  it('exact-fit on the cap boundary', () => {
    expect(computeCascadeBodyHeight({ ...baseInput, rowCount: 15 })).toBe(360)
  })

  it('zero rows still reserves the header pad + padding (defensive)', () => {
    expect(computeCascadeBodyHeight({ ...baseInput, rowCount: 0 })).toBe(48)
  })

  it('regression: pre-fix formula (no padding) would have clipped 3-row case', () => {
    // Sanity check on the constant the bug fix reasoning depends on.
    const preFix = 3 * 22 + 32 // 98 — the value that clipped in 
    const postFix = computeCascadeBodyHeight({ ...baseInput, rowCount: 3 })
    expect(postFix).toBeGreaterThan(preFix)
    expect(postFix - preFix).toBeGreaterThanOrEqual(8)
  })
})
