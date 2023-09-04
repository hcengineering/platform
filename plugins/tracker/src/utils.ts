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

import core, { ApplyOperations, Ref, SortingOrder, Status, TxOperations } from '@hcengineering/core'
import { createState } from '@hcengineering/task'
export { calcRank, genRanks } from '@hcengineering/task'

/**
 * Generates statuses for provided space.
 *
 * @public
 */
export async function createStatuses (
  client: TxOperations | ApplyOperations,
  statusClass: Status['_class'],
  categoryOfAttribute: Status['ofAttribute']
): Promise<Ref<Status>[]> {
  const categories = await client.findAll(
    core.class.StatusCategory,
    { ofAttribute: categoryOfAttribute },
    { sort: { order: SortingOrder.Ascending } }
  )

  const states: Ref<Status>[] = []

  for (const category of categories) {
    states.push(
      await createState(client, statusClass, {
        ofAttribute: categoryOfAttribute,
        name: category.defaultStatusName,
        category: category._id
      })
    )
  }

  return states
}
