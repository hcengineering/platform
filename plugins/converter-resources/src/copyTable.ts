//
// Copyright © 2026 TraceX SAS.
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

import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
import type { CopyAsMarkdownTableProps } from '@hcengineering/converter'
import { showPopup } from '@hcengineering/ui'
import type { BuildModelKey, TableSource, Viewlet } from '@hcengineering/view'
import { getTableFilterSource, viewletContextStore, type ViewletContext } from '@hcengineering/view-resources'
import { get } from 'svelte/store'
import CopyTableDialog from './components/CopyTableDialog.svelte'
import { repeatableOptions } from './trackedTable'

export interface CopyTableRequest {
  cardClass: Ref<Class<Doc>>
  query?: DocumentQuery<Doc>
  viewlet?: Viewlet
  config?: Array<string | BuildModelKey>
  /** Documents the action was invoked on; empty for the whole-view button. */
  selected?: Doc[]
}

/**
 * The last viewlet context belongs to this request only when it shows the same class and,
 * for an action, contains the documents the action was invoked on.
 */
function matchingContext (request: CopyTableRequest): ViewletContext | undefined {
  const context = get(viewletContextStore).getLastContext()
  if (context === undefined) return undefined
  const objects = context.relationshipTableData?.objects ?? context.objects ?? []
  const ids = new Set(objects.map((doc) => doc._id))
  const selected = request.selected ?? []
  if (selected.length > 0) return selected.every((doc) => ids.has(doc._id)) ? context : undefined
  return context._class === undefined || context._class === request.cardClass ? context : undefined
}

function commonClass (docs: Doc[] | undefined): Ref<Class<Doc>> | undefined {
  const first = docs?.[0]?._class
  return first !== undefined && docs?.every((doc) => doc._class === first) === true ? first : undefined
}

/** Open the copy dialog for an action (selected rows) or for the whole view. */
export function openCopyTableDialog (request: CopyTableRequest): void {
  const context = matchingContext(request)
  // Without a matching view, the rows' own class gives their columns: the action's class can be a
  // base class (cards of a specific type are all `card:class:Card` to the action).
  const cardClass = context?._class ?? commonClass(request.selected) ?? request.cardClass
  const relationship = context?.relationshipTableData
  // An explicit query (the view header button) wins; the context's resolved query is used only when
  // the context describes that same query.
  const visibleQuery = request.query ?? context?.query
  const sameQuery = context?.query !== undefined && JSON.stringify(context.query) === JSON.stringify(visibleQuery)
  const { savedViewModified = false, ...filterSource } = getTableFilterSource(cardClass, visibleQuery) ?? {}
  const source: TableSource = {
    kind: relationship === undefined ? 'table' : 'relationship',
    mode: 'frozen',
    ...filterSource,
    options: repeatableOptions(context?.options),
    baseOptions: repeatableOptions(context?.baseOptions),
    viewOptions: context?.viewOptions
  }
  const props: CopyAsMarkdownTableProps = {
    cardClass,
    viewlet: request.viewlet ?? context?.viewlet,
    config: request.config !== undefined && request.config.length > 0 ? request.config : context?.config,
    query: (sameQuery ? context?.sourceQuery : undefined) ?? visibleQuery,
    source
  }
  const loaded = relationship?.objects ?? context?.objects ?? []
  const order = new Map(loaded.map((doc, index) => [doc._id, index]))
  const selected = [...(request.selected ?? [])].sort(
    (a, b) => (order.get(a._id) ?? Infinity) - (order.get(b._id) ?? Infinity)
  )
  showPopup(CopyTableDialog, { props, selected, loaded, relationship, savedViewModified }, 'center')
}
