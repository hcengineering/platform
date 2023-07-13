//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core, { ApplyOperations, SortingOrder, Status, TxOperations, generateId } from '@hcengineering/core'
import { genRanks } from '@hcengineering/task'
export { calcRank, genRanks } from '@hcengineering/task'

/**
 * Generates statuses for provided space.
 *
 * @public
 */
export async function createStatuses (
  client: TxOperations | ApplyOperations,
  spaceId: Status['space'],
  statusClass: Status['_class'],
  categoryOfAttribute: Status['ofAttribute'],
  defaultStatusId: Status['_id']
): Promise<void> {
  const categories = await client.findAll(
    core.class.StatusCategory,
    { ofAttribute: categoryOfAttribute },
    { sort: { order: SortingOrder.Ascending } }
  )
  const ranks = [...genRanks(categories.length)]

  for (const [i, category] of categories.entries()) {
    const statusId = i === 0 ? defaultStatusId : generateId<Status>()
    const rank = ranks[i]

    await client.createDoc(
      statusClass,
      spaceId,
      {
        ofAttribute: categoryOfAttribute,
        name: category.defaultStatusName,
        category: category._id,
        rank
      },
      statusId
    )
  }
}
