/* eslint-disable @typescript-eslint/no-explicit-any */
import { computeOverflow } from './InlineFilterChips.svelte.helpers'

describe('computeOverflow', () => {
  it('shows all chips when container is wide enough', () => {
    expect(computeOverflow([80, 100, 120], 500, 60))
      .toEqual({ visibleCount: 3, hiddenCount: 0 })
  })

  it('collapses trailing chips and reserves space for the +N button', () => {
    expect(computeOverflow([120, 120, 120, 120, 120], 300, 60))
      .toEqual({ visibleCount: 2, hiddenCount: 3 })
  })

  it('hides all chips when none fit even with badge', () => {
    expect(computeOverflow([400], 200, 60))
      .toEqual({ visibleCount: 0, hiddenCount: 1 })
  })

  it('does not collapse when only one chip overflows by less than badge width', () => {
    expect(computeOverflow([120, 120, 50], 270, 60))
      .toEqual({ visibleCount: 1, hiddenCount: 2 })
  })
})
