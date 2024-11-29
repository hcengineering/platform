//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { get } from 'svelte/store'

import { type Doc, type DocumentQuery, type Ref, type Space, mergeQueries } from '@hcengineering/core'
import { ComponentContext } from '@hcengineering/view'
import { selectionStore } from '@hcengineering/view-resources'
import { getLocation } from '@hcengineering/ui'

/**
 * @public
 */
export function getComponentContext (
  context: ComponentContext | undefined,
  query: DocumentQuery<Doc> | undefined,
  space: Ref<Space> | undefined
): Record<string, any> {
  const resultQuery = getResultQuery(query, space, true)
  const selectedDocs = get(selectionStore)?.docs ?? []
  switch (context) {
    case ComponentContext.SELECTION:
      return selectedDocs.length > 0 ? { selectedDocs } : { query: resultQuery }
    case ComponentContext.CURRENT_FILTER:
      return { query: resultQuery }
    default:
      return {}
  }
}

/**
 * @public
 */
export function getResultQuery (
  query: DocumentQuery<Doc> | undefined,
  space: Ref<Space> | undefined,
  syncWithLocationQuery: boolean
): DocumentQuery<Doc> {
  const spaceQuery = space !== undefined ? { space } : {}
  let resultQuery = mergeQueries(query ?? {}, spaceQuery)
  if (syncWithLocationQuery) {
    resultQuery = mergeQueries(resultQuery, getLocation()?.query ?? {})
  }
  return resultQuery ?? {}
}
