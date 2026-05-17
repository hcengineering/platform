//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { writable } from 'svelte/store'

/**
 * Latest result-count from whichever viewlet is currently mounted.
 * Sentinel `-1` = "no current measurement" so consumers stay in their
 * default branch during teardown / route changes. Wired up in T8 — this
 * file is created in T6 only so that `rawSearchTextStore` below has a
 * home.
 */
export const resultIssueCountStore = writable<number>(-1)

/**
 * Raw user-typed search text (NOT the encoded $search wire form). T9's
 * HighlightedText reads this; SearchInputAdvanced consumer (IssuesView)
 * writes it on every debounced change event.
 */
export const rawSearchTextStore = writable<string>('')
