//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { writable } from 'svelte/store'

/**
 * Latest result-count from whichever viewlet is currently mounted.
 * Sentinel `-1` = "no current measurement" so consumers stay in their
 * default branch during teardown / route changes.
 */
export const resultIssueCountStore = writable<number>(-1)

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
