//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { IntlString } from '@hcengineering/platform'

// Labels of the existing SelectItemAll/SelectItemNone actions (declared in the view model and translated in view-assets)
export const selectAllItemsLabel = 'view:string:SelectItemAll' as IntlString
export const deselectAllItemsLabel = 'view:string:SelectItemNone' as IntlString

/**
 * Toggle the selection of one list group (category header "Select all" button).
 *
 * `selection`: the current selection of the list provider (may span groups).
 * `groupItems`: the items of the group that are currently loaded/displayed.
 * `limit`: the maximum number of group items added at once.
 *
 * If any item of the group is already selected, all selected items of the group
 * are removed from the selection; otherwise the group items (up to `limit`) are
 * appended. Items of other groups are always kept.
 */
export function toggleGroupSelection<T extends { _id: string }>(selection: T[], groupItems: T[], limit: number): T[] {
  const groupIds = new Set(groupItems.map((it) => it._id))
  if (selection.some((it) => groupIds.has(it._id))) {
    return selection.filter((it) => !groupIds.has(it._id))
  }
  const selectedIds = new Set(selection.map((it) => it._id))
  return [...selection, ...groupItems.slice(0, limit).filter((it) => !selectedIds.has(it._id))]
}
