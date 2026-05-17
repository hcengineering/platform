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
