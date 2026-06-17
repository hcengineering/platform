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

import type { Class, Doc, PersonId, Ref, Space } from '@hcengineering/core'

/**
 * Minimal shape required to delete a row (`attachment` rows use the
 * `attachedTo` / `attachedToClass` collection; `drive` rows use plain
 * `removeDoc`).
 *
 * @public
 */
export interface LargestFileRowRef {
  _id: Ref<Doc>
  _class: Ref<Class<Doc>>
  space: Ref<Space>
  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>
}

/**
 * Unified row shown in the "Largest files" table.
 *
 * Two source types are supported today:
 * - `'attachment'` — entries from `attachment.class.Attachment`
 * - `'drive'` — entries from `drive.class.File` (latest `FileVersion` size)
 *
 * @public
 */
export interface LargestFileRow {
  id: Ref<Doc>
  source: 'attachment' | 'drive'
  name: string
  size: number
  type: string
  lastModified: number
  owner: PersonId | undefined
  space: Ref<Space>
  /** Minimal info needed to issue a delete from this row. */
  ref: LargestFileRowRef
}

/**
 * Merge two pre-sorted (size descending) arrays into a single array sorted by
 * size descending.
 *
 * @public
 */
export function mergeBySizeDesc (a: LargestFileRow[], b: LargestFileRow[]): LargestFileRow[] {
  const result: LargestFileRow[] = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (compareRows(a[i], b[j]) <= 0) {
      result.push(a[i++])
    } else {
      result.push(b[j++])
    }
  }
  while (i < a.length) result.push(a[i++])
  while (j < b.length) result.push(b[j++])
  return result
}

function compareRows (x: LargestFileRow, y: LargestFileRow): number {
  if (x.size !== y.size) return y.size - x.size
  if (x.lastModified !== y.lastModified) return y.lastModified - x.lastModified
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0
}

/**
 * Pick the top `limit` rows by size from two pre-sorted inputs.
 *
 * @public
 */
export function topBySize (
  attachments: LargestFileRow[],
  driveFiles: LargestFileRow[],
  limit: number
): LargestFileRow[] {
  if (limit <= 0) return []
  const merged = mergeBySizeDesc(attachments, driveFiles)
  return merged.slice(0, limit)
}
