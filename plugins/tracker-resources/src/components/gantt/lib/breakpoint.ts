//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Tier-4 Item 13 — Mobile-Friendly Gantt — layout-mode detection.
 *
 * Pure helper module: maps a viewport width (typically `window.innerWidth`)
 * to one of the three mode buckets the Gantt UI cares about:
 *
 *   - `phone`  : ≤640 px — sidebar collapses to a slide-out drawer, the
 *                canvas is read-only (no drag, no connector-create, no
 *                editor popups).
 *   - `tablet` : 641–1024 px — full Edit-Mode but touch-aware: drag needs a
 *                long-press, hit-targets are enlarged.
 *   - `desktop`: >1024 px — legacy Desktop behaviour bit-for-bit.
 *
 * Defensive: any non-positive or NaN width is treated as `phone` so the
 * safest (read-only) mode wins when the caller hasn't measured yet.
 */

export type LayoutMode = 'phone' | 'tablet' | 'desktop'

export const PHONE_MAX_WIDTH = 640
export const TABLET_MAX_WIDTH = 1024

export function detectLayoutMode (width: number): LayoutMode {
  if (!Number.isFinite(width) || width <= 0) return 'phone'
  if (width <= PHONE_MAX_WIDTH) return 'phone'
  if (width <= TABLET_MAX_WIDTH) return 'tablet'
  return 'desktop'
}

export function isPhone (mode: LayoutMode): boolean {
  return mode === 'phone'
}

export function isTablet (mode: LayoutMode): boolean {
  return mode === 'tablet'
}

export function isDesktop (mode: LayoutMode): boolean {
  return mode === 'desktop'
}
