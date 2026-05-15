//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3a — Sidebar inline-grid columns.
 *
 * Pure helpers for the configurable Gantt sidebar column system. All inputs
 * are runtime-unknown (ViewOption storage) so the parsing path is defensive:
 * unknown shapes degrade gracefully to {@link DEFAULT_COLUMNS}. Width values
 * are clamped between {@link MIN_WIDTH} and {@link MAX_WIDTH} on every entry
 * — the resize handle in the header writes through `clampWidth`, so even a
 * misbehaving pointer (or a tampered preference) cannot push the sidebar
 * into an unusable state.
 */

/** Union of all built-in column keys recognised in Phase 3a v1. */
export type SidebarColumnKey =
  | 'identifier'
  | 'title'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'estimation'
  | 'component'
  | 'milestone'
  | 'predecessors'
  | 'slack'
  | 'startDate'
  | 'dueDate'
  | 'deadline'
  | 'progress'
  | 'modifiedOn'
  | 'createdOn'

/** Authoritative list of every recognised column key, ordered by intuitive UI grouping. */
export const ALL_COLUMN_KEYS: readonly SidebarColumnKey[] = [
  'identifier',
  'title',
  'status',
  'priority',
  'assignee',
  'estimation',
  'component',
  'milestone',
  'predecessors',
  'slack',
  'startDate',
  'dueDate',
  'deadline',
  'progress',
  'modifiedOn',
  'createdOn'
]

/**
 * Default visible columns when no user preference exists — preserves the
 * pre-Phase-3a sidebar exactly, so existing users see no surface change
 * on first upgrade.
 */
export const DEFAULT_COLUMNS: readonly SidebarColumnKey[] = [
  'identifier',
  'title',
  'predecessors',
  'slack'
]

/** Per-column default pixel width. Tweak in tandem with `.cell-{key}` CSS. */
export const DEFAULT_WIDTHS: Record<SidebarColumnKey, number> = {
  identifier: 80,
  title: 240,
  status: 100,
  priority: 80,
  assignee: 140,
  estimation: 80,
  component: 120,
  milestone: 140,
  predecessors: 140,
  slack: 60,
  startDate: 100,
  dueDate: 100,
  deadline: 100,
  progress: 80,
  modifiedOn: 100,
  createdOn: 100
}

/** Hard floor — narrower than this and the cell content is unreadable. */
export const MIN_WIDTH = 40
/** Hard ceiling — wider than this and the sidebar drowns the canvas. */
export const MAX_WIDTH = 400

const KNOWN_SET: ReadonlySet<string> = new Set(ALL_COLUMN_KEYS)

/**
 * Coerce an unknown ViewOption value into a SidebarColumnKey[]. Filters
 * unknown keys, deduplicates, and falls back to {@link DEFAULT_COLUMNS}
 * when the input shape is wrong or the resulting list would be empty.
 */
export function parseColumns (raw: unknown): SidebarColumnKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_COLUMNS]
  const seen = new Set<SidebarColumnKey>()
  const out: SidebarColumnKey[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    if (!KNOWN_SET.has(entry)) continue
    const key = entry as SidebarColumnKey
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  if (out.length === 0) return [...DEFAULT_COLUMNS]
  return out
}

/** Clamp + round a width value so persisted/dragged values stay sane. */
export function clampWidth (px: number): number {
  if (!Number.isFinite(px)) return MIN_WIDTH
  const rounded = Math.round(px)
  if (rounded < MIN_WIDTH) return MIN_WIDTH
  if (rounded > MAX_WIDTH) return MAX_WIDTH
  return rounded
}

/**
 *  fix — total pixel width of the visible column set. Used by the
 * extended sidebar grid to size the outer container to the actual columns
 * sum, so the outer GanttView sidebar grid-column tracks the inner grid
 * and the resize handle / column headers / overflow line up.
 *
 * Per-column overrides that are missing, negative, or non-finite are
 * coerced to {@link DEFAULT_WIDTHS} for that column — matches the
 * defensive parsing contract in {@link parseColumns}.
 */
export function computeTotalWidth (
  cols: readonly SidebarColumnKey[],
  widths: Record<string, number>
): number {
  let sum = 0
  for (const c of cols) {
    const override = widths[c]
    const usable = typeof override === 'number' && Number.isFinite(override) && override > 0
      ? override
      : DEFAULT_WIDTHS[c]
    sum += usable
  }
  return sum
}
