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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Doc, Ref } from '@hcengineering/core'
import type { SearchItem } from '@hcengineering/presentation'

/**
 * Drops excluded documents (e.g. inactive employees) from mention search results,
 * keeps at most `limit` items per category and renumbers items inside each category,
 * so the category header (rendered for `num === 0`) stays visible.
 */
export function excludeMentionItems (items: SearchItem[], excluded: Set<Ref<Doc>>, limit: number): SearchItem[] {
  const counts = new Map<Ref<Doc>, number>()
  const result: SearchItem[] = []
  for (const it of items) {
    if (excluded.has(it.item.doc._id)) continue
    const num = counts.get(it.category._id) ?? 0
    if (num >= limit) continue
    counts.set(it.category._id, num + 1)
    result.push({ ...it, num })
  }
  return result
}
