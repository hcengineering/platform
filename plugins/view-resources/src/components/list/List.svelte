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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnyComponent } from '@hcengineering/ui'
  import { BuildModelKey, ViewOptionModel, ViewOptions, ViewQueryOption } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { buildConfigLookup, LoadingProps } from '../../utils'
  import ListCategories from './ListCategories.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: (string | BuildModelKey)[]
  export let selectedObjectIds: Doc[] = []
  export let loadingProps: LoadingProps | undefined = undefined
  export let createItemDialog: AnyComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}

  export let documents: Doc[] | undefined = undefined

  const elementByIndex: Map<number, HTMLDivElement> = new Map()
  const docByIndex: Map<number, Doc> = new Map()
  const indexById: Map<Ref<Doc>, number> = new Map()

  let docs: Doc[] = []

  $: orderBy = viewOptions.orderBy

  const docsQuery = createQuery()
  $: lookup = buildConfigLookup(client.getHierarchy(), _class, config, options?.lookup)
  $: resultOptions = { ...options, lookup, sort: { [orderBy[0]]: orderBy[1] } }

  let resultQuery: DocumentQuery<Doc> = query
  $: getResultQuery(query, viewOptionsConfig, viewOptions).then((p) => {
    resultQuery = { ...p, ...query }
  })

  $: if (documents === undefined) {
    docsQuery.query(
      _class,
      resultQuery,
      (res) => {
        docs = res
        dispatch('content', docs)
      },
      resultOptions
    )
  } else {
    docsQuery.unsubscribe()
    docs = documents
    dispatch('content', docs)
  }

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  async function getResultQuery (
    query: DocumentQuery<Doc>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Doc>> {
    if (viewOptions === undefined) return query
    let result = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTarget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, query)
    }
    return result
  }

  function uncheckAll () {
    dispatch('check', { docs, value: false })
    selectedObjectIds = []
  }

  export function select (offset: 1 | -1 | 0, of?: Doc): void {
    let pos = (of !== undefined ? indexById.get(of._id) : -1) ?? -1
    pos += offset
    if (pos < 0) {
      pos = 0
    }
    if (pos >= docs.length) {
      pos = docs.length - 1
    }
    const target = docByIndex.get(pos)
    if (target !== undefined) {
      onRow(target)
    }
    const r = elementByIndex.get(pos)
    if (r !== undefined) {
      r.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }

  function onRow (object: Doc): void {
    dispatch('row-focus', object)
  }

  const getLoadingElementsLength = (props: LoadingProps | undefined, options?: FindOptions<Doc>) => {
    if (!props) return undefined
    if (options?.limit && options.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }

  let dragItem: {
    doc?: Doc
    revert?: () => void
  } = {}

  let listDiv: HTMLDivElement
</script>

<div class="list-container" bind:this={listDiv}>
  <ListCategories
    newObjectProps={() => (space ? { space } : {})}
    {elementByIndex}
    {indexById}
    {docs}
    {_class}
    {space}
    {lookup}
    loadingPropsLength={getLoadingElementsLength(loadingProps, options)}
    {baseMenuClass}
    {config}
    {viewOptions}
    {docByIndex}
    {viewOptionsConfig}
    {selectedObjectIds}
    level={0}
    {createItemDialog}
    {createItemLabel}
    {loadingProps}
    on:check
    on:uncheckAll={uncheckAll}
    on:row-focus
    {flatHeaders}
    {disableHeader}
    {props}
    {listDiv}
    bind:dragItem
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
