<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import core, {
    Class,
    Doc,
    DocumentQuery,
    FindOptions,
    RateLimiter,
    Ref,
    Space,
    mergeQueries
  } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, reduceCalls } from '@hcengineering/presentation'
  import { AnyComponent, AnySvelteComponent } from '@hcengineering/ui'
  import { BuildModelKey, ViewOptionModel, ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { SelectionFocusProvider } from '../../selection'
  import { claimResultCountOwner, releaseResultCountOwner, setResultCount } from '../../stores'
  import { buildConfigLookup } from '../../utils'
  import { getResultOptions, getResultQuery } from '../../viewOptions'
  import ListCategories from './ListCategories.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: Array<string | BuildModelKey>
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  export let selectedObjectIds: Doc[] = []
  export let createItemDialog: AnyComponent | AnySvelteComponent | undefined = undefined
  export let createItemDialogProps: Record<string, any> | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let createItemEvent: string | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}
  export let selection: number | undefined = undefined
  export let compactMode: boolean = false
  export let listProvider: SelectionFocusProvider
  export let singleCategoryLimit: number | undefined = undefined
  export let readonly: boolean = false
  // Opt-in participation in the shared result-count protocol, evaluated once at
  // mount. Defaults to `false` so the only List instance that touches the count
  // store is the one that explicitly opts in — the PRIMARY tracker viewlet
  // (ListView passes `true`). Every other List mount stays out by default:
  // embedded sub-issues / related issues in an issue panel, card-panel children,
  // process extensions, and any future embedding. An embedded List that claimed
  // the owner token would supersede the primary list's token, then release it on
  // close — stranding the primary list with a dead token whose future writes are
  // no-ops, so the zero-hit card could never render again. Default-out keeps the
  // primary viewlet the sole owner and makes new embeddings safe without having
  // to remember to opt out.
  export let reportResultCount: boolean = false

  const limiter = new RateLimiter(10)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let docs: Doc[] = []
  let fastDocs: Doc[] = []
  let slowDocs: Doc[] = []

  // The opted-in PRIMARY viewlet writes its result-count into the shared
  // result-count store (via the owner-token gate) so IssuesView's SearchEmptyState
  // card can render when search has no matches. We claim ownership at init so a
  // viewlet torn down after us can no longer clobber our count, and release on
  // destroy. Instances that leave `reportResultCount` at its default (`false`)
  // get no owner and never touch the gate — see the prop comment above.
  // queryReady is RE-armed false on every query change (`$: queryReady = false`
  // below) so a stale count from a previous query never lingers as truth —
  // without this reset the SearchEmptyState card could remain stuck on `0`
  // after a successful search produced new results.
  const resultCountOwner = reportResultCount ? claimResultCountOwner() : undefined
  let queryReady = false
  $: if (queryReady && resultCountOwner !== undefined) setResultCount(resultCountOwner, docs.length)
  onDestroy(() => {
    if (resultCountOwner !== undefined) releaseResultCountOwner(resultCountOwner)
  })

  $: orderBy = viewOptions.orderBy

  const docsQuery = createQuery()
  const docsQuerySlow = createQuery()

  $: lookup = buildConfigLookup(client.getHierarchy(), _class, config, options?.lookup)
  $: configOptions = options
  $: resultOptions = {
    ...configOptions,
    ...(Object.keys(lookup).length > 0 ? { lookup } : {}),
    ...(orderBy !== undefined ? { sort: { [orderBy[0]]: orderBy[1] } } : {})
  }

  const updateOptions = reduceCalls(async function (options: FindOptions<Doc> | undefined, viewOptions: ViewOptions) {
    configOptions = await getResultOptions(options, viewOptionsConfig, viewOptions)
  })
  $: void updateOptions(options, viewOptions)

  let resultQuery: DocumentQuery<Doc> = query

  const update = reduceCalls(async function (query: DocumentQuery<Doc>, viewOptions: ViewOptions) {
    const p = await getResultQuery(hierarchy, query, viewOptionsConfig, viewOptions)
    resultQuery = mergeQueries(p, query)
  })
  $: void update(query, viewOptions)

  $: queryNoLookup = noLookup(resultQuery)
  // Re-arm queryReady whenever the underlying query mutates so the result
  // count stops claiming the previous query's outcome (see comment above).
  //
  // Re-arm only when the query CONTENT changes, not on every new object
  // identity. `queryNoLookup` is rebuilt as a fresh object on each cycle, but
  // createQuery() skips the callback for a deep-equal query — so resetting
  // queryReady on identity alone would strand it at `false` (callback never
  // re-fires) and the count/SearchEmptyState would stay stale forever.
  let lastQuerySig: string | undefined
  $: {
    const sig = JSON.stringify(queryNoLookup)
    if (sig !== lastQuerySig) {
      lastQuerySig = sig
      queryReady = false
    }
  }

  let fastQueryIds = new Set<Ref<Doc>>()

  let categoryQueryOptions: Partial<FindOptions<Doc>>
  $: categoryQueryOptions = {
    ...noLookupSortingOptions(resultOptions),
    projection: {
      ...resultOptions.projection,
      _id: 1,
      _class: 1,
      ...getProjection(viewOptions.groupBy, queryNoLookup, _class)
    }
  }

  $: docsQuery.query(
    _class,
    queryNoLookup,
    (res) => {
      fastDocs = res
      fastQueryIds = new Set(res.map((it) => it._id))
      queryReady = true
    },
    { ...categoryQueryOptions, limit: 1000 }
  )

  $: if (fastDocs.length === 1000 && queryNoLookup.$search == null) {
    docsQuerySlow.query(
      _class,
      queryNoLookup,
      (res) => {
        slowDocs = res
      },
      categoryQueryOptions
    )
  } else {
    slowDocs = []
  }

  $: docs = [...fastDocs, ...slowDocs.filter((it) => !fastQueryIds.has(it._id))]

  function getProjection (fields: string[], query: DocumentQuery<Doc>, _class: Ref<Class<Doc>>): Record<string, number> {
    const res: Record<string, number> = {}
    for (const f of fields) {
      /*
        Mongo projection doesn't support properties fields which
        start from $. Such field here is $search. The least we could do
        is to filter all properties which start from $.
      */
      if (!f.startsWith('$')) {
        res[f] = 1
      }
    }
    for (const f of Object.keys(query)) {
      if (!f.startsWith('$')) {
        res[f] = 1
      }
    }
    if (client.getHierarchy().isDerived(_class, core.class.AttachedDoc)) {
      res.attachedTo = 1
      res.attachedToClass = 1
      res.collection = 1
    }
    return res
  }

  function noLookup (query: DocumentQuery<Doc>): DocumentQuery<Doc> {
    const newQuery: DocumentQuery<Doc> = {}
    for (const [k, v] of Object.entries(query)) {
      if (!k.startsWith('$lookup.')) {
        newQuery[k] = v
      }
    }
    return newQuery
  }

  function noLookupSortingOptions (options: FindOptions<Doc>): FindOptions<Doc> {
    const { lookup, sort, ...resultOptions } = options
    return resultOptions
  }

  const dispatch = createEventDispatcher()

  $: dispatch('content', docs)

  function uncheckAll (): void {
    dispatch('check', { docs, value: false })
    selectedObjectIds = []
  }

  export function select (offset: 2 | -2 | 1 | -1 | 0, of?: Doc, noScroll?: boolean): void {
    if (of !== undefined || offset !== 0) {
      listCategories?.select(offset, of, undefined, noScroll)
    }
  }

  let dragItem: {
    doc?: Doc
    revert?: () => void
  } = {}

  let listDiv: HTMLDivElement
  let listCategories: ListCategories
</script>

<div class="list-container" bind:this={listDiv}>
  <ListCategories
    bind:this={listCategories}
    newObjectProps={() => (space != null ? { space } : {})}
    {docs}
    {_class}
    {space}
    {selection}
    query={resultQuery}
    {lookup}
    {baseMenuClass}
    {config}
    {configurations}
    {viewOptions}
    {viewOptionsConfig}
    {selectedObjectIds}
    {limiter}
    {listProvider}
    level={0}
    groupPersistKey={''}
    {createItemDialog}
    {createItemDialogProps}
    {createItemLabel}
    {createItemEvent}
    {singleCategoryLimit}
    on:check
    on:uncheckAll={uncheckAll}
    on:row-focus
    {flatHeaders}
    {disableHeader}
    {props}
    {listDiv}
    {compactMode}
    bind:dragItem
    on:select={(evt) => {
      select(0, evt.detail)
    }}
    on:select-next={(evt) => {
      select(2, evt.detail)
    }}
    on:select-prev={(evt) => {
      select(-2, evt.detail)
    }}
    on:collapsed
    {resultQuery}
    {resultOptions}
    {readonly}
  />
</div>

<style lang="scss">
  .list-container {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: max-content;
    min-width: auto;
    min-height: 0;
  }
</style>
