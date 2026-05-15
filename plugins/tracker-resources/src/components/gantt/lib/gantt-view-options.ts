//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Tier-2 #7 — Saved Gantt-Views.
// Pure (de)serialization helpers for the Gantt-specific keys we tunnel
// through `FilteredView.viewOptions` (which is itself a
// `Record<string, any>`). See spec:
// docs/superpowers/specs/2026-05-14-huly-gantt-saved-views-design.md
// §"Datenmodell-Änderungen".
//
//   ganttZoomLevel   : 'day' | 'week' | 'month' | 'quarter' (required)
//   ganttPanAnchorDate?: 'YYYY-MM-DD' (UTC midnight; only when the user
//                                      ticks the "Zeitfenster fixieren"
//                                      checkbox during save)
//
// No schema migration is needed — `FilteredView.viewOptions` is open.

import type { ZoomLevel } from './types'

const ZOOM_LEVELS: readonly ZoomLevel[] = ['day', 'week', 'month', 'quarter']
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface GanttSavedViewOptions {
  zoomLevel: ZoomLevel
  /** ISO 'YYYY-MM-DD' UTC-midnight anchor, only set when the user fixes the time window. */
  panAnchorDate?: string
}

function isZoomLevel (v: unknown): v is ZoomLevel {
  return typeof v === 'string' && (ZOOM_LEVELS as readonly string[]).includes(v)
}

function isValidIsoDate (v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const t = Date.parse(v + 'T00:00:00Z')
  return Number.isFinite(t)
}

/** Read the Gantt-specific keys back out of a (possibly mixed) viewOptions blob. */
export function extractGanttSavedView (raw: Record<string, unknown> | undefined): GanttSavedViewOptions {
  if (raw == null) return { zoomLevel: 'week' }
  const zoom = isZoomLevel(raw.ganttZoomLevel) ? raw.ganttZoomLevel : 'week'
  const out: GanttSavedViewOptions = { zoomLevel: zoom }
  if (isValidIsoDate(raw.ganttPanAnchorDate)) {
    out.panAnchorDate = raw.ganttPanAnchorDate
  }
  return out
}

/**
 * Write the Gantt-specific keys into a viewOptions blob without mutating the
 * caller's object. Unrelated keys (ganttShowTitle, ganttConfirmMove, …) are
 * preserved. If `panAnchorDate` is absent in the payload, any stale
 * `ganttPanAnchorDate` in the base is dropped — "Zeitfenster fixieren"
 * unchecked must clear a previously-saved anchor.
 */
export function mergeGanttSavedView (
  base: Record<string, unknown> | undefined,
  opts: GanttSavedViewOptions
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(base ?? {}) }
  out.ganttZoomLevel = opts.zoomLevel
  if (opts.panAnchorDate !== undefined) {
    out.ganttPanAnchorDate = opts.panAnchorDate
  } else {
    delete out.ganttPanAnchorDate
  }
  return out
}

/** Format a millisecond timestamp as 'YYYY-MM-DD' (UTC). */
export function isoDateForTimestamp (t: number): string {
  const d = new Date(t)
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0')
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const dd = d.getUTCDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Parse 'YYYY-MM-DD' to UTC-midnight ms. Returns NaN on malformed input. */
export function timestampForIsoDate (iso: string): number {
  if (!ISO_DATE_RE.test(iso)) return Number.NaN
  return Date.parse(iso + 'T00:00:00Z')
}
