//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Tier-2 #7 — Saved Gantt-Views.
// Pure helpers that filter and partition a flat `FilteredView[]` list
// (as delivered by a live `view.class.FilteredView` query) for the
// Gantt toolbar dropdown:
//
//   * Keep only docs whose `viewletId === tracker.viewlet.IssueGantt`.
//   * Split into `mine` (current user is in `users[]`) vs `shared`
//     (`sharable === true` and current user is NOT in `users[]`).
//   * Alphabetic, case-insensitive sort per bucket.
//
// `viewSelectionOptions()` flattens the two buckets into a single
// dropdown-friendly array, preserving the bucket as `group` metadata so
// the UI can insert a visual separator.

import type { Ref } from '@hcengineering/core'
import type { FilteredView, Viewlet } from '@hcengineering/view'

export interface GanttViewBuckets {
  mine: FilteredView[]
  shared: FilteredView[]
}

export interface GanttViewOption {
  id: Ref<FilteredView>
  name: string
  group: 'mine' | 'shared'
}

function byNameCaseInsensitive (a: FilteredView, b: FilteredView): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export function filterGanttFilteredViews (
  all: FilteredView[],
  ganttViewletId: Ref<Viewlet>,
  myAccountUuid: string
): GanttViewBuckets {
  const onlyGantt = all.filter((v) => v.viewletId === ganttViewletId)
  const mine: FilteredView[] = []
  const shared: FilteredView[] = []
  for (const v of onlyGantt) {
    const isMine = Array.isArray(v.users) && v.users.includes(myAccountUuid as any)
    if (isMine) {
      mine.push(v)
    } else if (v.sharable === true) {
      shared.push(v)
    }
  }
  mine.sort(byNameCaseInsensitive)
  shared.sort(byNameCaseInsensitive)
  return { mine, shared }
}

export function viewSelectionOptions (mine: FilteredView[], shared: FilteredView[]): GanttViewOption[] {
  const out: GanttViewOption[] = []
  for (const v of mine) out.push({ id: v._id, name: v.name, group: 'mine' })
  for (const v of shared) out.push({ id: v._id, name: v.name, group: 'shared' })
  return out
}
