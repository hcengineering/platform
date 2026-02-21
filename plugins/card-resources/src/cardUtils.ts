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

import core, { type Hierarchy, toRank } from '@hcengineering/core'
import { type Card } from '@hcengineering/card'

/**
 * Get the IDs string for a card (attributes with showInPresenter, sorted by rank).
 * Same logic as CardPresenter title line prefix.
 */
export function getCardIds (object: Card | undefined, hierarchy: Hierarchy): string {
  if (object === undefined) return ''
  const attrs = [...hierarchy.getAllAttributes(object._class, core.class.Doc).values()].sort((a, b) => {
    const rankA = a.rank ?? toRank(a._id) ?? ''
    const rankB = b.rank ?? toRank(b._id) ?? ''
    return rankA.localeCompare(rankB)
  })
  const res: string[] = []
  for (const attr of attrs) {
    const val = (object as any)[attr.name]
    if ((attr as { showInPresenter?: boolean }).showInPresenter === true && val !== undefined) {
      if (typeof val === 'string' || typeof val === 'number') {
        res.push(val.toString())
      } else if (typeof val === 'boolean') {
        res.push(val ? '✅' : '❌️')
      }
    }
  }
  return res.join(' ')
}

/**
 * Get the version string for a card (e.g. "v1") when VersionableClass is enabled.
 * Same logic as CardPresenter title line suffix.
 */
export function getCardVersion (val: Card | undefined, hierarchy: Hierarchy): string {
  if (val === undefined) return ''
  const mixin = hierarchy.classHierarchyMixin(val._class, core.mixin.VersionableClass)
  if (mixin != null && mixin.enabled) {
    return 'v' + (val.version ?? 1)
  }
  return ''
}
