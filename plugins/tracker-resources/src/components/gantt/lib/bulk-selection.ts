//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

/**
 * Tier-2 Item 6 — Bulk-Select + Bulk-Drag.
 *
 * Pure selection-state helpers. Every function returns a fresh `Set`; the
 * input is never mutated so the caller can use these helpers from inside a
 * Svelte reactive block without surprising aliasing.
 *
 * Order in `selectRange`'s `orderedIds` is the visible row order in the
 * sidebar (post-sort, post-filter, post-tree-expand). The bulk-select UX
 * spec defines "Shift-Click range" as the inclusive set of issues between
 * the anchor and the target in *that* order — not in document order, not in
 * Issue identifier order. See Spec §"UI/UX-Verhalten / Shift-Click".
 */

/**
 * Toggle the membership of `id` in `set`. The input set is never mutated.
 */
export function toggleSelection<T> (set: ReadonlySet<T>, id: T): Set<T> {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * Return a set containing only `id`. Used for the plain-click branch which
 * discards any prior multi-selection.
 */
export function selectSingle<T> (id: T): Set<T> {
  return new Set([id])
}

/**
 * Range-select from `anchorId` to `targetId` in the order given by
 * `orderedIds`. Existing entries in `current` are preserved. If `anchorId`
 * is null or one of the endpoints is not in `orderedIds`, the function
 * falls back to selecting just the target (matches the behaviour of every
 * file-explorer Shift-Click I have ever used).
 */
export function selectRange (
  current: ReadonlySet<Ref<Issue>>,
  anchorId: Ref<Issue> | null,
  targetId: Ref<Issue>,
  orderedIds: ReadonlyArray<Ref<Issue>>
): Set<Ref<Issue>> {
  if (anchorId === null) {
    const next = new Set(current)
    next.add(targetId)
    return next
  }
  const anchorIdx = orderedIds.indexOf(anchorId)
  const targetIdx = orderedIds.indexOf(targetId)
  if (anchorIdx < 0 || targetIdx < 0) {
    const fallback = new Set(current)
    fallback.add(targetId)
    return fallback
  }
  const [lo, hi] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
  const next = new Set(current)
  for (let i = lo; i <= hi; i++) next.add(orderedIds[i])
  return next
}

/** Return an empty selection set. Esc / background-click branch. */
export function clearSelection (): Set<Ref<Issue>> {
  return new Set()
}

/**
 * Return a set with every entry from `orderedIds`. Cmd-A branch. Duplicates
 * in the input are collapsed by the Set constructor.
 */
export function selectAll (orderedIds: ReadonlyArray<Ref<Issue>>): Set<Ref<Issue>> {
  return new Set(orderedIds)
}
