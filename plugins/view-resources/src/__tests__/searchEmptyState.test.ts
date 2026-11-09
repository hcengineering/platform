import { shouldShowSearchEmptyState, shouldShowEmptyState } from '../searchEmptyState'

describe('shouldShowEmptyState', () => {
  it('returns true when search has text and no results', () => {
    expect(shouldShowEmptyState('loader', 0)).toBe(true)
  })
  it('returns false when search is empty even with 0 results', () => {
    expect(shouldShowEmptyState('', 0)).toBe(false)
    expect(shouldShowEmptyState('   ', 0)).toBe(false)
  })
  it('returns false when there are results', () => {
    expect(shouldShowEmptyState('loader', 1)).toBe(false)
    expect(shouldShowEmptyState('loader', 100)).toBe(false)
  })
  it('returns false during the not-yet-measured sentinel (-1)', () => {
    expect(shouldShowEmptyState('loader', -1)).toBe(false)
  })
})

describe('shouldShowSearchEmptyState', () => {
  it('shows the card on a zero-hit search when shouldShowAll is off', () => {
    expect(shouldShowSearchEmptyState('loader', 0, false)).toBe(true)
    expect(shouldShowSearchEmptyState('loader', 0, undefined)).toBe(true)
  })
  it('suppresses the card (empty groups stay visible) when shouldShowAll is on', () => {
    // The explicit "show empty groups" option wins over the empty-state card.
    expect(shouldShowSearchEmptyState('loader', 0, true)).toBe(false)
  })
  it('suppresses the card when shouldShowAll is on', () => {
    expect(shouldShowSearchEmptyState('foo', 0, true)).toBe(false)
    expect(shouldShowSearchEmptyState('foo', 0, undefined)).toBe(true)
  })
  it('never shows the card when there are results, regardless of shouldShowAll', () => {
    expect(shouldShowSearchEmptyState('loader', 3, false)).toBe(false)
    expect(shouldShowSearchEmptyState('loader', 3, true)).toBe(false)
  })
  it('never shows the card without a search term', () => {
    expect(shouldShowSearchEmptyState('', 0, false)).toBe(false)
    expect(shouldShowSearchEmptyState('  ', 0, false)).toBe(false)
  })
})
