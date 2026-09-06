//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
/**
 * Pure predicate: should the SearchEmptyState card render?
 *
 * True iff the user has typed something AND the viewlet reports zero hits.
 * `resultCount === -1` is the "not yet measured" sentinel (set on viewlet
 * teardown / before the first store write) and must NOT trigger the
 * empty-state — otherwise route transitions would flash the card.
 */
export function shouldShowEmptyState (searchText: string, resultCount: number): boolean {
  return searchText.trim() !== '' && resultCount === 0
}

/**
 * Pure policy: should the SearchEmptyState card be rendered at all?
 *
 * The card never replaces the viewlet — the viewlet stays mounted and laid out
 * and the card renders as a non-suppressive sibling below it (see the comment
 * in IssuesView.svelte for why unmounting/hiding the viewlet is not an option).
 * This predicate only gates the card itself: on a zero-hit search it shows,
 * unless the explicit "show empty groups" view option (`shouldShowAll`) is on —
 * then the empty groups / Kanban columns stay visible and the card is
 * suppressed, keeping the user's explicit choice authoritative.
 */
export function shouldShowSearchEmptyState (
  searchText: string,
  resultCount: number,
  shouldShowAll: boolean | undefined
): boolean {
  return shouldShowEmptyState(searchText, resultCount) && shouldShowAll !== true
}
