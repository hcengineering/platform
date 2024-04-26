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
  import { IntlString, getResource } from '@hcengineering/platform'
  import { createQuery, getClient, reduceCalls } from '@hcengineering/presentation'
  import { AnyComponent, AnySvelteComponent } from '@hcengineering/ui'
  import { BuildModelKey, ViewOptionModel, ViewOptions, ViewQueryOption, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { SelectionFocusProvider } from '../../selection'
  import { buildConfigLookup } from '../../utils'
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
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}
  export let selection: number | undefined = undefined
  export let compactMode: boolean = false
  export let listProvider: SelectionFocusProvider

  const limiter = new RateLimiter(10)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let docs: Doc[] = []
  let fastDocs: Doc[] = []
  let slowDocs: Doc[] = []

  $: orderBy = viewOptions.orderBy

  const docsQuery = createQuery()
  const docsQuerySlow = createQuery()

  $: lookup = buildConfigLookup(client.getHierarchy(), _class, config, options?.lookup)
  $: resultOptions = { ...options, lookup, ...(orderBy !== undefined ? { sort: { [orderBy[0]]: orderBy[1] } } : {}) }

  let resultQuery: DocumentQuery<Doc> = query

  const update = reduceCalls(async function (query: DocumentQuery<Doc>, viewOptions: ViewOptions) {
    const p = await getResultQuery(query, viewOptionsConfig, viewOptions)
    resultQuery = mergeQueries(p, query)
  })
  $: void update(query, viewOptions)

  $: queryNoLookup = noLookup(resultQuery)

  let fastQueryIds = new Set<Ref<Doc>>()

  let categoryQueryOptions: Partial<FindOptions<Doc>>
  $: categoryQueryOptions = {
    ...noLookupOptions(resultOptions),
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
      // console.log('query, res', queryNoLookup, res)
      fastQueryIds = new Set(res.map((it) => it._id))
    },
    { ...categoryQueryOptions, limit: 1000 }
  )

  $: if (fastDocs.length === 1000) {
    docsQuerySlow.query(
      _class,
      queryNoLookup,
      (res) => {
        slowDocs = res
      },
      categoryQueryOptions
    )
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

  function noLookupOptions (options: FindOptions<Doc>): FindOptions<Doc> {
    const { lookup, ...resultOptions } = options
    return resultOptions
  }

  const dispatch = createEventDispatcher()

  $: dispatch('content', docs)

  async function getResultQuery (
    query: DocumentQuery<Doc>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Doc>> {
    if (viewOptions === undefined) return query
    let result: DocumentQuery<Doc> = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTarget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      const resultP = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, result)
      if (resultP instanceof Promise) {
        result = await resultP
      } else {
        result = resultP
      }
    }
    return result
  }

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
    min-height: auto;
  }
</style>
