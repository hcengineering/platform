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

import { SortingOrder } from '@hcengineering/core'
import { type OrderOption } from '@hcengineering/view'

/**
 * Manual (rank) ordering follows the user's drag-and-drop order, so a reversed
 * direction has no meaning there and must not be offered. A key that is not a
 * string means the editor got no single order option, so nothing is offered either.
 */
export function hasOrderDirection (key: unknown): boolean {
  return typeof key === 'string' && key !== 'rank'
}

export function reverseOrder (order: OrderOption): OrderOption {
  const direction = order[1] === SortingOrder.Ascending ? SortingOrder.Descending : SortingOrder.Ascending
  return [order[0], direction]
}

/**
 * Picks the new ordering when `key` is chosen in the Ordering dropdown: choosing
 * the active key again reverses the direction, any other key uses its default.
 */
export function selectOrder (
  current: OrderOption | undefined,
  key: string,
  options: OrderOption[]
): OrderOption | undefined {
  const option = options.find((p) => p[0] === key)
  if (option === undefined) return undefined
  if (current?.[0] === key && hasOrderDirection(key)) return reverseOrder(current)
  return [...option]
}
