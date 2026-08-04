/* eslint-disable @typescript-eslint/no-explicit-any */
import { computeOverflow } from '../components/filter/InlineFilterChips.svelte.helpers'

describe('computeOverflow', () => {
  it('shows all chips when container is wide enough', () => {
    expect(computeOverflow([80, 100, 120], 500, 60)).toEqual({ visibleCount: 3, hiddenCount: 0 })
  })

  it('collapses trailing chips and reserves space for the +N button', () => {
    expect(computeOverflow([120, 120, 120, 120, 120], 300, 60)).toEqual({ visibleCount: 2, hiddenCount: 3 })
  })

  it('hides all chips when none fit even with badge', () => {
    expect(computeOverflow([400], 200, 60)).toEqual({ visibleCount: 0, hiddenCount: 1 })
  })

  it('does not collapse when only one chip overflows by less than badge width', () => {
    expect(computeOverflow([120, 120, 50], 270, 60)).toEqual({ visibleCount: 1, hiddenCount: 2 })
  })

  // ─── Inter-chip flex gaps must count toward overflow ──────────────────────
  it('shows all chips when container is wide enough (incl. gaps)', () => {
    // 3 chips + 2 gaps(8) = 316 <= 500
    expect(computeOverflow([80, 100, 120], 500, 32, 8)).toEqual({ visibleCount: 3, hiddenCount: 0 })
  })

  it('accounts for inter-chip gaps when deciding overflow', () => {
    // widths sum 300 <= 300 but +2 gaps(8)=316 > 300 → must collapse
    expect(computeOverflow([100, 100, 100], 300, 32, 8).hiddenCount).toBeGreaterThan(0)
  })

  it('reserves only the real badge width', () => {
    expect(computeOverflow([120, 120, 120, 120, 120], 300, 32, 8)).toEqual({ visibleCount: 2, hiddenCount: 3 })
  })
})
