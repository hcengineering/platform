import { shouldReplaceViewletWithEmptyState, shouldShowEmptyState } from './SearchEmptyState.helpers'

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

describe('shouldReplaceViewletWithEmptyState', () => {
  it('replaces the viewlet on a zero-hit search when shouldShowAll is off', () => {
    expect(shouldReplaceViewletWithEmptyState('loader', 0, false)).toBe(true)
    expect(shouldReplaceViewletWithEmptyState('loader', 0, undefined)).toBe(true)
  })
  it('keeps the viewlet (empty groups stay visible) when shouldShowAll is on', () => {
    // The explicit "show empty groups" option wins over the empty-state card.
    expect(shouldReplaceViewletWithEmptyState('loader', 0, true)).toBe(false)
  })
  it('never replaces the viewlet when there are results, regardless of shouldShowAll', () => {
    expect(shouldReplaceViewletWithEmptyState('loader', 3, false)).toBe(false)
    expect(shouldReplaceViewletWithEmptyState('loader', 3, true)).toBe(false)
  })
  it('never replaces the viewlet without a search term', () => {
    expect(shouldReplaceViewletWithEmptyState('', 0, false)).toBe(false)
    expect(shouldReplaceViewletWithEmptyState('  ', 0, false)).toBe(false)
  })
})
