//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
/**
 * Decide the input's local value after a parent-prop change.
 *
 * C1: the previous inline `$: if (value !== _search && value !== undefined)`
 * block read BOTH `value` and `_search`, so Svelte re-ran it on every
 * keystroke and clobbered the user's edit back to the (empty) prop. This
 * helper compares the prop ONLY against the last prop we adopted — never
 * against the live local value — so it fires exactly once per real prop
 * change and leaves mid-typing edits intact.
 */
export function reconcilePropValue (
  propValue: string | undefined,
  lastProp: string | undefined,
  current: string
): { value: string, lastProp: string | undefined } {
  if (propValue === lastProp) return { value: current, lastProp }
  return { value: propValue ?? current, lastProp: propValue }
}
