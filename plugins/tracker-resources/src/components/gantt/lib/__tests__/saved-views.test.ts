//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { FilteredView, Viewlet } from '@hcengineering/view'
import type { Ref } from '@hcengineering/core'
import { filterGanttFilteredViews, viewSelectionOptions } from '../saved-views'

const GANTT = 'gantt-id' as Ref<Viewlet>
const LIST = 'list-id' as Ref<Viewlet>
const ME = 'me-uuid'

function fv (over: Partial<FilteredView>): FilteredView {
  return {
    _id: 'fv1',
    _class: 'fv-class',
    space: 'workspace',
    modifiedOn: 0,
    modifiedBy: ME,
    createdBy: ME,
    name: 'Test',
    location: { path: [], query: {}, fragment: undefined } as any,
    filters: '[]',
    attachedTo: 'tracker',
    users: [ME],
    sharable: false,
    viewletId: GANTT,
    ...(over as any)
  } as unknown as FilteredView
}

describe('filterGanttFilteredViews', () => {
  it('keeps only viewletId === gantt', () => {
    const all = [
      fv({ _id: 'a' as any, viewletId: GANTT }),
      fv({ _id: 'b' as any, viewletId: LIST })
    ]
    const { mine, shared } = filterGanttFilteredViews(all, GANTT, ME)
    expect(mine.map((v: FilteredView) => v._id)).toEqual(['a'])
    expect(shared).toEqual([])
  })

  it('partitions own vs sharable-by-others', () => {
    const other = 'someone-else'
    const all = [
      fv({ _id: 'own' as any, users: [ME] }),
      fv({ _id: 'theirs-public' as any, users: [other], sharable: true, createdBy: other }),
      fv({ _id: 'theirs-private' as any, users: [other], sharable: false, createdBy: other })
    ]
    const { mine, shared } = filterGanttFilteredViews(all, GANTT, ME)
    expect(mine.map((v: FilteredView) => v._id)).toEqual(['own'])
    expect(shared.map((v: FilteredView) => v._id)).toEqual(['theirs-public'])
  })

  it('returns empty arrays when given empty input', () => {
    expect(filterGanttFilteredViews([], GANTT, ME)).toEqual({ mine: [], shared: [] })
  })

  it('sorts mine alphabetically case-insensitive', () => {
    const all = [
      fv({ _id: 'b' as any, name: 'beta' }),
      fv({ _id: 'a' as any, name: 'Alpha' }),
      fv({ _id: 'c' as any, name: 'gamma' })
    ]
    const { mine } = filterGanttFilteredViews(all, GANTT, ME)
    expect(mine.map((v: FilteredView) => v.name)).toEqual(['Alpha', 'beta', 'gamma'])
  })

  it('sorts shared alphabetically case-insensitive', () => {
    const other = 'someone-else'
    const all = [
      fv({ _id: 's2' as any, name: 'Zulu', users: [other], sharable: true, createdBy: other }),
      fv({ _id: 's1' as any, name: 'alpha', users: [other], sharable: true, createdBy: other })
    ]
    const { shared } = filterGanttFilteredViews(all, GANTT, ME)
    expect(shared.map((v: FilteredView) => v.name)).toEqual(['alpha', 'Zulu'])
  })

  it('handles missing users array gracefully', () => {
    const broken = { ...fv({ _id: 'x' as any }), users: undefined } as unknown as FilteredView
    const { mine, shared } = filterGanttFilteredViews([broken], GANTT, ME)
    expect(mine).toEqual([])
    expect(shared).toEqual([])
  })
})

describe('viewSelectionOptions', () => {
  it('returns mine-first then shared with group metadata', () => {
    const mine = [fv({ _id: 'm1' as any, name: 'M1' })]
    const shared = [fv({ _id: 's1' as any, name: 'S1' })]
    const opts = viewSelectionOptions(mine, shared)
    expect(opts).toHaveLength(2)
    expect(opts[0]).toMatchObject({ id: 'm1', name: 'M1', group: 'mine' })
    expect(opts[1]).toMatchObject({ id: 's1', name: 'S1', group: 'shared' })
  })

  it('omits shared entries when shared bucket is empty', () => {
    const opts = viewSelectionOptions([fv({ _id: 'm1' as any })], [])
    expect(opts.every((o) => o.group === 'mine')).toBe(true)
    expect(opts).toHaveLength(1)
  })

  it('returns empty array when both buckets empty', () => {
    expect(viewSelectionOptions([], [])).toEqual([])
  })
})
