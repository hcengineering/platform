//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { SelectPopupValueType } from './types'

/**
 * @public
 */
export type SelectPopupRow =
  | {
    kind: 'category'
    category: NonNullable<SelectPopupValueType['category']>
    count: number
    collapsed: boolean
  }
  | { kind: 'item', item: SelectPopupValueType }

/**
 * Builds the rows of a select popup with collapsible category headers.
 * Items are expected to be ordered by category; consecutive items with the same
 * category label form one group. Items without a category get no header.
 * When expandAll is set (e.g. while searching), collapsed groups are shown expanded.
 *
 * @public
 */
export function buildSelectPopupRows (
  items: SelectPopupValueType[],
  collapsed: ReadonlySet<string>,
  expandAll: boolean = false
): SelectPopupRow[] {
  const rows: SelectPopupRow[] = []
  let header: Extract<SelectPopupRow, { kind: 'category' }> | undefined
  for (const item of items) {
    const category = item.category
    if (category === undefined) {
      header = undefined
      rows.push({ kind: 'item', item })
      continue
    }
    if (header === undefined || header.category.label !== category.label) {
      header = { kind: 'category', category, count: 0, collapsed: !expandAll && collapsed.has(category.label) }
      rows.push(header)
    }
    header.count++
    if (!header.collapsed) {
      rows.push({ kind: 'item', item })
    }
  }
  return rows
}

function collapsedStorageKey (key: string): string {
  return `selectPopup.collapsedCategories.${key}`
}

/**
 * @public
 */
export function loadCollapsedCategories (key: string | undefined): Set<string> {
  if (key === undefined) return new Set()
  try {
    const value = JSON.parse(localStorage.getItem(collapsedStorageKey(key)) ?? '[]')
    return new Set(Array.isArray(value) ? value.filter((it) => typeof it === 'string') : [])
  } catch {
    return new Set()
  }
}

/**
 * @public
 */
export function saveCollapsedCategories (key: string | undefined, collapsed: ReadonlySet<string>): void {
  if (key === undefined) return
  try {
    if (collapsed.size === 0) {
      localStorage.removeItem(collapsedStorageKey(key))
    } else {
      localStorage.setItem(collapsedStorageKey(key), JSON.stringify(Array.from(collapsed)))
    }
  } catch {
    // Storage may be unavailable, collapse state is then kept only while the popup is open
  }
}
