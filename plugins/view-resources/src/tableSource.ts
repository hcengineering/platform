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
import { getCurrentLocation } from '@hcengineering/ui'
import type { Filter, FilteredView, Viewlet, ViewOptions } from '@hcengineering/view'
import { get } from 'svelte/store'
import { selectedFilterStore } from './filter'
import { activeViewlet, makeViewletKey } from './utils'
import { getViewOptions, viewOptionStore } from './viewOptions'

/**
 * What a filter bar applies to its view: the query it starts from and the filters it adds.
 * @public
 */
export interface QueryFilterSource {
  cardClass?: Ref<Class<Doc>>
  /** The query before the filter bar applied its filters. */
  baseQuery: DocumentQuery<Doc>
  /** The filters that produced the query, serialized like `FilteredView.filters`. */
  filters: string
  /** The query the filter bar handed to its view; tells views of the same class apart. */
  resultQuery?: DocumentQuery<Doc>
}

/**
 * Filter bars publish their source here while they are mounted, keyed by an instance id. This is
 * an explicit channel: it does not depend on the query object surviving clones and merges on its
 * way to the table.
 */
const filterSources = new Map<string, QueryFilterSource>()

/** Publish (or, with `undefined`, withdraw) the source of a mounted filter bar. @public */
export function publishFilterSource (id: string, source: QueryFilterSource | undefined): void {
  filterSources.delete(id)
  if (source !== undefined) filterSources.set(id, source)
}

/** JSON with sorted object keys, so equal queries compare equal after clones and merges. */
function canonical (value: unknown): string {
  return JSON.stringify(value, (_key, current) =>
    current !== null && typeof current === 'object' && !Array.isArray(current)
      ? Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)))
      : current
  )
}

/** The view query contains everything the filter bar produced (views may add their own terms). */
function feeds (source: QueryFilterSource, viewQuery: DocumentQuery<Doc>): boolean {
  if (source.resultQuery === undefined) return false
  const view = viewQuery as Record<string, unknown>
  return Object.entries(source.resultQuery).every(([key, value]) => canonical(view[key]) === canonical(value))
}

/**
 * The source of the filter bar that produced `viewQuery`. Several views of one class can be open
 * at once (a list and a panel, say), so a source is only returned when it is the one that fed the
 * view, or, without a view query, when it is the only one for the class. Otherwise the copy keeps
 * just the query it was shown, rather than another view's filters.
 * @public
 */
export function getFilterSource (
  cardClass: Ref<Class<Doc>>,
  viewQuery?: DocumentQuery<Doc>
): QueryFilterSource | undefined {
  const sources = [...filterSources.values()].filter(
    (source) => source.cardClass === undefined || source.cardClass === cardClass
  )
  if (viewQuery === undefined) return sources.length === 1 ? sources[0] : undefined
  const exact = sources.filter((source) => canonical(source.resultQuery) === canonical(viewQuery))
  const matching = exact.length > 0 ? exact : sources.filter((source) => feeds(source, viewQuery))
  // Equal results describe the same rows; the most recently updated one is as good as any.
  return matching[matching.length - 1]
}

/**
 * Whether the active filters, viewlet or view options differ from a saved view.
 * @public
 */
export function savedViewDiffers (
  selected: FilteredView,
  filters: Filter[] | string,
  activeViewlets: Record<string, Ref<Viewlet> | null>,
  viewOptions: Map<string, ViewOptions>
): boolean {
  const key = makeViewletKey(getCurrentLocation())
  if (selected.viewletId !== activeViewlets[key]) return true
  if (selected.filters !== (typeof filters === 'string' ? filters : JSON.stringify(filters))) return true
  if (selected.viewletId !== null) {
    const current = getViewOptions({ _id: selected.viewletId } as unknown as Viewlet, viewOptions)
    if (JSON.stringify(selected.viewOptions) !== JSON.stringify(current)) return true
  }
  return false
}

/**
 * Explicit source of a table query. When a saved view is open, it is reported together with whether
 * the filters on screen differ from it, so the user can choose between following the saved view and
 * keeping what is shown now.
 * @public
 */
export function getTableFilterSource (
  cardClass: Ref<Class<Doc>>,
  viewQuery?: DocumentQuery<Doc>
):
  | {
      baseQuery: DocumentQuery<Doc>
      filters: string
      filteredViewId?: Ref<FilteredView>
      savedViewModified?: boolean
    }
  | undefined {
  const source = getFilterSource(cardClass, viewQuery)
  if (source === undefined) return undefined
  const selected = get(selectedFilterStore)
  if (selected === undefined || (selected.filterClass !== undefined && selected.filterClass !== cardClass)) {
    return { baseQuery: source.baseQuery, filters: source.filters }
  }
  const savedViewModified = savedViewDiffers(selected, source.filters, get(activeViewlet), get(viewOptionStore))
  return { baseQuery: source.baseQuery, filters: source.filters, filteredViewId: selected._id, savedViewModified }
}

/**
 * Keep serialized JSON inside an HTML comment: `<` and `>` are escaped so values such as `-->`
 * cannot close the comment early. `JSON.parse` restores them unchanged.
 * @public
 */
export function escapeCommentJson (json: string): string {
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}
