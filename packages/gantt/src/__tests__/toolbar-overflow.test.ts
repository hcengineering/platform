//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  TIER_FALLBACK_PX,
  TOOLBAR_COLLAPSE_ORDER,
  TOOLBAR_TIERS,
  computeToolbarOverflow,
  type ToolbarTier
} from '../toolbar-overflow'

const ALL: ToolbarTier[] = [...TOOLBAR_TIERS]

// One easy-to-reason-about width per tier.
const W: Record<ToolbarTier, number> = {
  group: 100,
  nav: 200,
  date: 150,
  zoom: 120,
  undo: 60,
  savedview: 90
}

const GAP = 4
const MORE = 28

describe('computeToolbarOverflow', () => {
  it('keeps everything inline when the available width is not measured yet', () => {
    expect(computeToolbarOverflow(ALL, W, -1, GAP, MORE)).toEqual({ visible: ALL, hidden: [] })
    expect(computeToolbarOverflow(ALL, W, Number.NaN, GAP, MORE)).toEqual({ visible: ALL, hidden: [] })
  })

  it('treats a measured zero width as "collapse everything", not as unmeasured', () => {
    // A cluster squeezed to 0 px must not re-expand into a box it cannot fit
    // into — that is what pushed the trailing buttons out of the viewport.
    expect(computeToolbarOverflow(ALL, W, 0, GAP, MORE)).toEqual({ visible: [], hidden: ALL })
  })

  it('keeps everything inline when it fits exactly', () => {
    // 100+200+150+120+60+90 = 720, plus five gaps = 740
    const r = computeToolbarOverflow(ALL, W, 740, GAP, MORE)
    expect(r.hidden).toEqual([])
    expect(r.visible).toEqual(ALL)
  })

  it('collapses the least important tier first', () => {
    const r = computeToolbarOverflow(ALL, W, 739, GAP, MORE)
    expect(r.hidden).toEqual(['savedview'])
    expect(r.visible).toEqual(['group', 'nav', 'date', 'zoom', 'undo'])
  })

  it('collapses further tiers in TOOLBAR_COLLAPSE_ORDER as space shrinks', () => {
    expect(computeToolbarOverflow(ALL, W, 600, GAP, MORE).hidden).toEqual(['date', 'savedview'])
    expect(computeToolbarOverflow(ALL, W, 450, GAP, MORE).hidden).toEqual(['group', 'date', 'savedview'])
    expect(computeToolbarOverflow(ALL, W, 400, GAP, MORE).hidden).toEqual(['group', 'date', 'undo', 'savedview'])
    expect(computeToolbarOverflow(ALL, W, 300, GAP, MORE).hidden).toEqual([
      'group',
      'date',
      'zoom',
      'undo',
      'savedview'
    ])
  })

  it('collapses everything on a phone-sized budget', () => {
    const r = computeToolbarOverflow(ALL, W, 40, GAP, MORE)
    expect(r.visible).toEqual([])
    expect(r.hidden).toEqual(ALL)
  })

  it('never drops a tier — visible + hidden is always the input set', () => {
    for (const available of [-1, 0, 30, 120, 300, 500, 740, 2000]) {
      const r = computeToolbarOverflow(ALL, W, available, GAP, MORE)
      expect([...r.visible, ...r.hidden].sort()).toEqual([...ALL].sort())
    }
  })

  it('preserves the caller-supplied visual order in both buckets', () => {
    const r = computeToolbarOverflow(ALL, W, 300, GAP, MORE)
    expect(r.visible).toEqual(ALL.filter((t) => !r.hidden.includes(t)))
    expect(r.hidden).toEqual(ALL.filter((t) => r.hidden.includes(t)))
  })

  it('ignores tiers that are not present', () => {
    const present: ToolbarTier[] = ['nav', 'zoom']
    // nav(200) + zoom(120) + gap = 324 > 240; nav alone plus the "…" trigger
    // is 200 + 4 + 28 = 232 and fits.
    const r = computeToolbarOverflow(present, W, 240, GAP, MORE)
    expect(r.visible).toEqual(['nav'])
    expect(r.hidden).toEqual(['zoom'])
  })

  it('falls back to TIER_FALLBACK_PX for unmeasured tiers', () => {
    const present: ToolbarTier[] = ['nav', 'zoom']
    // Both unmeasured: 2 * fallback + one gap.
    const fits = 2 * TIER_FALLBACK_PX + GAP
    expect(computeToolbarOverflow(present, {}, fits, GAP, MORE).hidden).toEqual([])
    expect(computeToolbarOverflow(present, {}, fits - 1, GAP, MORE).hidden).toEqual(['zoom'])
  })

  it('accounts for the "…" trigger once collapsing has started', () => {
    const present: ToolbarTier[] = ['nav', 'savedview']
    // nav(200) alone would fit into 210, but the trigger adds 28 + 4 gap.
    const r = computeToolbarOverflow(present, W, 210, GAP, MORE)
    expect(r.visible).toEqual([])
    expect(r.hidden).toEqual(present)
  })

  it('reserves nothing for a trigger rendered outside the measured box', () => {
    // What production passes: the "…" trigger lives in the frozen trailing
    // group (it would be clipped away inside a cluster that legitimately
    // shrinks to 0 px), so neither its width nor a gap for it may be charged
    // to the cluster's budget.
    const present: ToolbarTier[] = ['nav', 'savedview']
    const r = computeToolbarOverflow(present, W, 210, GAP, 0)
    expect(r.visible).toEqual(['nav'])
    expect(r.hidden).toEqual(['savedview'])
  })

  it('exposes a collapse order that covers every tier exactly once', () => {
    expect([...TOOLBAR_COLLAPSE_ORDER].sort()).toEqual([...TOOLBAR_TIERS].sort())
  })

  it('is idempotent for a stable measurement', () => {
    const first = computeToolbarOverflow(ALL, W, 500, GAP, MORE)
    const second = computeToolbarOverflow(ALL, W, 500, GAP, MORE)
    expect(second).toEqual(first)
  })
})
