//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
/**
 * Compute how many filter chips fit into a container before they need to be
 * collapsed into a "+N" overflow badge. Pure function — invoked from the
 * Svelte component's ResizeObserver callback.
 *
 * `chipWidths`: measured px-widths of each chip in insertion order.
 * `containerWidth`: available px width.
 * `badgeWidth`: reserved px for the "+N" button when overflow happens.
 * `gap`: inter-chip flex gap in px. Counted between adjacent chips
 *   both in the fit-all check and while greedily filling, so the overflow
 *   decision matches what the browser actually lays out.
 *
 * If all chips fit: { visibleCount: chipWidths.length, hiddenCount: 0 }.
 * Else: greedily fit chips left-to-right, reserving `badgeWidth` for the
 * overflow indicator; remaining chips count toward `hiddenCount`.
 */
export function computeOverflow (
  chipWidths: number[],
  containerWidth: number,
  badgeWidth: number,
  gap: number = 0
): { visibleCount: number, hiddenCount: number } {
  const n = chipWidths.length
  const total = chipWidths.reduce((s, w) => s + w, 0) + Math.max(0, n - 1) * gap
  if (total <= containerWidth) {
    return { visibleCount: n, hiddenCount: 0 }
  }
  const allowed = containerWidth - badgeWidth
  let used = 0
  let visible = 0
  for (const w of chipWidths) {
    const add = w + (visible > 0 ? gap : 0)
    if (used + add > allowed) break
    used += add
    visible++
  }
  return { visibleCount: visible, hiddenCount: n - visible }
}
