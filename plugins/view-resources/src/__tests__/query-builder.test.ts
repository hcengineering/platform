/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DocumentQuery, Doc } from '@hcengineering/core'
import type { Filter, FilterMode } from '@hcengineering/view'
import { makeFilterQuery } from '../filter/query-builder'

const mockResult = async (filter: Filter): Promise<{ $in: unknown }> => ({ $in: filter.value })
const mockResolveResource = jest.fn(async () => mockResult)

const mockMode = { result: 'mock:resource:Result' as any } as unknown as FilterMode
const mockFilter = (key: string, value: unknown[], idx = 1): Filter => ({
  key: { _class: '' as any, key, attribute: undefined as any, label: '' as any, component: '' as any },
  mode: 'mock:mode:In' as any,
  modes: [],
  value: value as any,
  index: idx
})

describe('makeFilterQuery', () => {
  beforeEach(() => {
    mockResolveResource.mockClear()
  })

  it('returns base query when filter list is empty', async () => {
    const base: DocumentQuery<Doc> = { space: 'foo' as any }
    const out = await makeFilterQuery(base, [], async () => mockMode, mockResolveResource as any)
    expect(out).toEqual({ space: 'foo' })
    expect(mockResolveResource).not.toHaveBeenCalled()
  })

  it('resolves the resource then AND-combines a single $in filter', async () => {
    const base: DocumentQuery<Doc> = {}
    const filters: Filter[] = [mockFilter('status', ['a', 'b'])]
    const out = await makeFilterQuery(base, filters, async () => mockMode, mockResolveResource as any)
    expect(out).toEqual({ status: { $in: ['a', 'b'] } })
    expect(mockResolveResource).toHaveBeenCalledWith('mock:resource:Result')
  })

  it('intersects $in operators across two filters on same key', async () => {
    const base: DocumentQuery<Doc> = {}
    const filters: Filter[] = [mockFilter('status', ['a', 'b'], 1), mockFilter('status', ['b', 'c'], 2)]
    const out = await makeFilterQuery(base, filters, async () => mockMode, mockResolveResource as any)
    expect(out).toEqual({ status: { $in: ['b'] } })
  })

  it('intersects $gte/$lte date bounds across two filters on same key', async () => {
    const base: DocumentQuery<Doc> = {}
    // Each filter emits a { $gte, $lte } range from [gte, lte] — mimics the
    // real before/after/dateToday date outputs.
    const rangeResult = async (filter: Filter): Promise<{ $gte: unknown, $lte: unknown }> => ({
      $gte: filter.value[0],
      $lte: filter.value[1]
    })
    const resolveRange = jest.fn(async () => rangeResult)
    const filters: Filter[] = [mockFilter('dueDate', [10, 100], 1), mockFilter('dueDate', [20, 80], 2)]
    const out = await makeFilterQuery(base, filters, async () => mockMode, resolveRange as any)
    // The tighter bound must win on each side: $gte = max(10, 20), $lte = min(100, 80).
    expect(out).toEqual({ dueDate: { $gte: 20, $lte: 80 } })
  })

  it('preserves base query fields untouched by the filters', async () => {
    const base: DocumentQuery<Doc> = { space: 'foo' as any, modifiedOn: 123 as any }
    const filters: Filter[] = [mockFilter('status', ['x'])]
    const out = await makeFilterQuery(base, filters, async () => mockMode, mockResolveResource as any)
    expect(out).toEqual({ space: 'foo', modifiedOn: 123, status: { $in: ['x'] } })
  })

  it('skips filters whose mode resolver returns undefined', async () => {
    const base: DocumentQuery<Doc> = {}
    const filters: Filter[] = [mockFilter('status', ['x'])]
    const out = await makeFilterQuery(base, filters, async () => undefined, mockResolveResource as any)
    expect(out).toEqual({})
    expect(mockResolveResource).not.toHaveBeenCalled()
  })

  it('does not mutate the caller-owned base query (deep clone)', async () => {
    // The caller usually passes a stable `query` prop. If the helper mutated
    // it the next reactive cycle would start from corrupt state. Verified by
    // composing onto a base that already has a nested object at the filter's
    // target key — the resulting `out` must merge, but `base` must survive
    // unchanged.
    const base: DocumentQuery<Doc> = { status: { $in: ['initial'] } as any }
    const baseSnapshot = JSON.parse(JSON.stringify(base))
    const filters: Filter[] = [mockFilter('status', ['x'])]
    await makeFilterQuery(base, filters, async () => mockMode, mockResolveResource as any)
    expect(base).toEqual(baseSnapshot)
  })
})
