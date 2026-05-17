import { shouldShowEmptyState } from './SearchEmptyState.helpers'

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
