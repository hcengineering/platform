//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { writable, type Readable } from 'svelte/store'

/**
 * Latest result-count from whichever viewlet is currently mounted.
 * Sentinel `-1` = "no current measurement" so consumers stay in their
 * default branch during teardown / route changes.
 *
 * The writable is module-private; the public export is a `Readable` so the
 * owner-token gate below is the ONLY write path. Consumers (IssuesView's
 * SearchEmptyState) subscribe to the read-only store directly and unchanged.
 */
const resultIssueCountWritable = writable<number>(-1)
export const resultIssueCountStore: Readable<number> = resultIssueCountWritable

/**
 * Owner-token gate for {@link resultIssueCountStore}.
 *
 * WHY: several viewlets write the shared count (List, KanbanView, and — after
 * PR-2 — GanttView), while the container (IssuesView) resets it on query/filter
 * changes and reads it for the zero-hit empty state. When the user switches
 * viewlet, the outgoing viewlet's teardown and the incoming viewlet's mount
 * both touch the store. Previously correctness relied on a non-local framework
 * invariant (Svelte's destroy-before-mount ordering): a late teardown `.set(-1)`
 * from the outgoing viewlet could clobber the incoming viewlet's fresh count.
 *
 * The gate makes writes order-independent: each writer claims a token at
 * mount/init, which becomes the current owner; only the current owner's writes
 * take effect, and a `release()` from a superseded (non-current) owner is a
 * no-op. A viewlet torn down AFTER its successor already claimed can therefore
 * no longer reset the count out from under the new viewlet.
 *
 * ASSUMPTION: at most ONE IssuesView surface is active at a time (Issues / My
 * Issues route to the same IssuesView, only one mounted). The count store is a
 * process-global singleton, so two simultaneously-visible IssuesView surfaces
 * would share it; that is out of scope by design (the proportional fix here is
 * the token gate, not per-instance scoping of the generic List component).
 */
export interface ResultCountOwner {
  readonly id: symbol
}

let currentResultCountOwner: ResultCountOwner | undefined

/**
 * Claim ownership of the result-count store. The returned token becomes the
 * current owner immediately, superseding any previous owner (whose subsequent
 * writes and releases turn into no-ops). Call at viewlet mount/init.
 */
export function claimResultCountOwner (): ResultCountOwner {
  const owner: ResultCountOwner = { id: Symbol('resultCountOwner') }
  currentResultCountOwner = owner
  return owner
}

/**
 * Write a measured count. Ignored unless `owner` is the current owner, so a
 * superseded viewlet can never overwrite the active viewlet's count.
 */
export function setResultCount (owner: ResultCountOwner, count: number): void {
  if (owner !== currentResultCountOwner) return
  resultIssueCountWritable.set(count)
}

/**
 * Release ownership at viewlet teardown. Resets the store to the `-1` sentinel
 * ONLY when `owner` is still the current owner — a release from a superseded
 * owner (successor already claimed) is a no-op and leaves the successor's count
 * intact.
 */
export function releaseResultCountOwner (owner: ResultCountOwner): void {
  if (owner !== currentResultCountOwner) return
  currentResultCountOwner = undefined
  resultIssueCountWritable.set(-1)
}

/**
 * Reset the count to the `-1` "pending" sentinel on a query/filter change,
 * WITHOUT surrendering ownership — the current owner viewlet stays authoritative
 * and its next {@link setResultCount} re-populates the value once the new query
 * resolves. Called by the container (IssuesView), which drives query/filter
 * state but does not hold the viewlet's token; the reset therefore operates on
 * whatever the current owner is.
 */
export function resetResultCount (): void {
  resultIssueCountWritable.set(-1)
}

/**
 * Raw user-typed search text (NOT the encoded $search wire form).
 * HighlightedText reads this; SearchInputAdvanced consumer (IssuesView)
 * writes it on every debounced change event.
 */
export const rawSearchTextStore = writable<string>('')

/**
 * Customize-View toggle: whether matched substrings should be visually
 * highlighted in result rows. Defaults to true. The IssuesView consumer
 * mirrors `viewOptions.searchHighlight` into this store so HighlightedText
 * can short-circuit to a no-op when the user turned highlighting off.
 */
export const searchHighlightEnabledStore = writable<boolean>(true)
