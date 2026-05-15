//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3b — Group-By Swimlanes — pure helpers.
 *
 * Issues are grouped into horizontal swimlanes by a single attribute. This
 * module produces the *group key* for an issue (a string usable as a Map
 * key) and a deterministic order over those keys for display. Sentinel
 * constants flag rows whose value is null/undefined and need a synthetic
 * "Unassigned" lane.
 *
 * Group **labels** for sentinels are returned as English baseline strings
 * here; the UI layer is responsible for swapping them with an i18n'd
 * version through `tracker.string.GanttUnassigned` etc., and for resolving
 * real ids (status, person, component, milestone, label) to display names
 * via the project stores. Keeping labels English here means the helper
 * stays pure and synchronous, and the unit test does not need a translator
 * stub.
 */

import type { Issue } from '@hcengineering/tracker'

/** Union of all supported group-by keys. `none` disables grouping. */
export type GroupByKey =
  | 'none'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'component'
  | 'milestone'
  | 'label'

/** Authoritative list of group-by keys including `none`, in UI dropdown order. */
export const GROUP_BY_KEYS: readonly GroupByKey[] = [
  'none',
  'status',
  'priority',
  'assignee',
  'component',
  'milestone',
  'label'
]

// Sentinel group keys. Chosen so they cannot collide with real Ref<Doc> ids
// (which are 24-hex Mongo-style or generated). Double-underscore prefix +
// no hex chars makes the namespace unambiguous.
export const NONE_KEY = '__none__'
export const UNASSIGNED_KEY = '__unassigned__'
export const NO_COMPONENT_KEY = '__no_component__'
export const NO_MILESTONE_KEY = '__no_milestone__'
export const NO_LABEL_KEY = '__no_label__'
export const UNKNOWN_GROUP_KEY = '__unknown__'

const ALL_SENTINELS: ReadonlySet<string> = new Set([
  NONE_KEY,
  UNASSIGNED_KEY,
  NO_COMPONENT_KEY,
  NO_MILESTONE_KEY,
  NO_LABEL_KEY,
  UNKNOWN_GROUP_KEY
])

/**
 * Compute the group key for one issue under the active group-by mode.
 *
 * For `label` we only use the first label (Spec §"Edge-case `label`"). A
 * multi-bucket mode would let an issue appear in every label-lane it owns,
 * but would also double-count it — deferred to v2.
 */
export function resolveGroupKey (issue: Issue, groupBy: GroupByKey): string {
  switch (groupBy) {
    case 'none':
      return NONE_KEY
    case 'status':
      return issue.status != null ? String(issue.status) : UNKNOWN_GROUP_KEY
    case 'priority':
      // Priority 0 ("No priority") is a valid bucket, distinct from null.
      return String(issue.priority ?? 0)
    case 'assignee':
      return issue.assignee != null ? String(issue.assignee) : UNASSIGNED_KEY
    case 'component':
      return issue.component != null ? String(issue.component) : NO_COMPONENT_KEY
    case 'milestone': {
      const ms = (issue as unknown as { milestone?: string | null }).milestone
      return ms != null ? String(ms) : NO_MILESTONE_KEY
    }
    case 'label': {
      const labels = (issue as unknown as { labels?: unknown }).labels
      if (Array.isArray(labels) && labels.length > 0 && labels[0] != null) {
        return String(labels[0])
      }
      return NO_LABEL_KEY
    }
    default:
      return NONE_KEY
  }
}

/**
 * Sort keys for display. Sentinel "empty" rows go last so the populated
 * lanes are visually emphasized. Priority is numeric ascending; everything
 * else is lexicographic. Real id-to-display-name sorting (e.g. assignees
 * by full name) is a UI-layer follow-up — it requires the person/status
 * stores which the helper layer cannot import without breaking purity.
 */
export function sortGroupKeys (keys: readonly string[], groupBy: GroupByKey): string[] {
  const arr = [...keys]
  if (groupBy === 'priority') {
    arr.sort((a, b) => Number(a) - Number(b))
    return arr
  }
  arr.sort((a, b) => {
    const aSent = ALL_SENTINELS.has(a)
    const bSent = ALL_SENTINELS.has(b)
    if (aSent && !bSent) return 1
    if (!aSent && bSent) return -1
    return a < b ? -1 : a > b ? 1 : 0
  })
  return arr
}

/**
 * Best-effort English label for a group key. Used as a UI fallback when
 * the i18n layer cannot find a translated string — and as the spec-mandated
 * sentinel labels when the key is a synthetic placeholder.
 *
 * When `nameLookup` is provided, real ids (status, priority, assignee,
 * component, milestone, label) are resolved to their display name via the
 * map; missing entries still fall back to the raw key so the UI does not
 * crash on async store warm-up. v121 user-feedback: previously the sidebar
 * rendered the raw Mongo-style id for any non-sentinel key, which made
 * group-by unusable for Component/Milestone/Label/Status/Priority.
 */
export function getGroupLabel (
  key: string,
  _groupBy: GroupByKey,
  nameLookup?: ReadonlyMap<string, string>
): string {
  switch (key) {
    case NONE_KEY:
      return 'All issues'
    case UNASSIGNED_KEY:
      return 'Unassigned'
    case NO_COMPONENT_KEY:
      return 'No component'
    case NO_MILESTONE_KEY:
      return 'No milestone'
    case NO_LABEL_KEY:
      return 'No label'
    case UNKNOWN_GROUP_KEY:
      return '(unknown)'
    default: {
      if (nameLookup !== undefined) {
        const resolved = nameLookup.get(key)
        if (resolved !== undefined && resolved !== '') return resolved
      }
      return key
    }
  }
}
