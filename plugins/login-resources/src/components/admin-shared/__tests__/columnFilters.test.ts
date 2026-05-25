import { mergeColumnFilters } from '../columnFilters'

describe('mergeColumnFilters', () => {
  it('returns {} for an empty map', () => {
    expect(mergeColumnFilters({})).toEqual({})
  })

  it('spreads each partial into a single object', () => {
    expect(mergeColumnFilters({
      name: { nameContains: 'foo' },
      status: { statusIn: ['active'] }
    })).toEqual({
      nameContains: 'foo',
      statusIn: ['active']
    })
  })

  it('later keys win on collision', () => {
    expect(mergeColumnFilters({
      a: { x: 1 },
      b: { x: 2 }
    })).toEqual({ x: 2 })
  })

  it('skips null entries (cleared filters)', () => {
    expect(mergeColumnFilters({
      a: { x: 1 },
      b: null as any,
      c: { y: 2 }
    })).toEqual({ x: 1, y: 2 })
  })

  it('skips undefined entries', () => {
    expect(mergeColumnFilters({
      a: { x: 1 },
      b: undefined as any
    })).toEqual({ x: 1 })
  })
})
