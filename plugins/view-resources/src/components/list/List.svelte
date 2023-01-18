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
  import core, { Class, Doc, DocumentQuery, FindOptions, Ref, Space } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnyComponent } from '@hcengineering/ui'
  import view, {
    AttributeModel,
    BuildModelKey,
    ViewOptionModel,
    ViewOptions,
    ViewQueryOption
  } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { buildConfigLookup, buildModel, getCategories, getPresenter, groupBy, LoadingProps } from '../../utils'
  import { noCategory } from '../../viewOptions'
  import ListCategory from './ListCategory.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: (string | BuildModelKey)[]
  export let selectedObjectIds: Doc[] = []
  export let selectedRowIndex: number | undefined = undefined
  export let loadingProps: LoadingProps | undefined = undefined
  export let createItemDialog: AnyComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let props: Record<string, any> = {}

  export let documents: Doc[] | undefined = undefined

  const objectRefs: HTMLElement[] = []
  let docs: Doc[] = []

  $: groupByKey = viewOptions.groupBy ?? noCategory
  $: orderBy = viewOptions.orderBy
  $: groupedDocs = groupBy(docs, groupByKey)
  let categories: any[] = []
  $: getCategories(client, _class, docs, groupByKey).then((p) => {
    categories = p
  })

  const docsQuery = createQuery()
  $: resultOptions = { lookup, ...options, sort: { [orderBy[0]]: orderBy[1] } }

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
  }

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: lookup = options?.lookup ?? buildConfigLookup(client.getHierarchy(), _class, config)

  const spaceQuery = createQuery()

  let currentSpace: Space | undefined
  let itemModels: AttributeModel[]

  async function getResultQuery (
    query: DocumentQuery<Doc>,
    viewOptions: ViewOptionModel[] | undefined,
    viewOptionsStore: ViewOptions
  ): Promise<DocumentQuery<Doc>> {
    if (viewOptions === undefined) return query
    let result = hierarchy.clone(query)
    for (const viewOption of viewOptions) {
      if (viewOption.actionTartget !== 'query') continue
      const queryOption = viewOption as ViewQueryOption
      const f = await getResource(queryOption.action)
      result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, query)
    }
    return result
  }

  const getLoadingElementsLength = (props: LoadingProps | undefined, options?: FindOptions<Doc>) => {
    if (!props) return undefined
    if (options?.limit && options.limit > 0) {
      return Math.min(options.limit, props.length)
    }

    return props.length
  }

  $: spaceQuery.query(core.class.Space, { _id: space }, (res) => {
    ;[currentSpace] = res
  })

  function getHeader (_class: Ref<Class<Doc>>, groupByKey: string): void {
    if (groupByKey === noCategory) {
      headerComponent = undefined
    } else {
      getPresenter(client, _class, { key: groupByKey }, { key: groupByKey }).then((p) => (headerComponent = p))
    }
  }

  let headerComponent: AttributeModel | undefined
  $: getHeader(_class, groupByKey)
  $: buildModel({ client, _class, keys: config, lookup }).then((res) => {
    itemModels = res
  })

  function getInitIndex (categories: any, i: number): number {
    let res = 0
    for (let index = 0; index < i; index++) {
      const cat = categories[index]
      res += groupedDocs[cat].length
    }
    return res
  }

  function uncheckAll () {
    dispatch('check', { docs, value: false })
    selectedObjectIds = []
  }

  $: extraHeaders = getAdditionalHeader(_class)

  function getAdditionalHeader (_class: Ref<Class<Doc>>): AnyComponent[] | undefined {
    const clazz = hierarchy.getClass(_class)
    let mixinClazz = hierarchy.getClass(_class)
    let presenterMixin = hierarchy.as(clazz, view.mixin.ListHeaderExtra)
    while (presenterMixin.presenters === undefined && mixinClazz.extends !== undefined) {
      presenterMixin = hierarchy.as(mixinClazz, view.mixin.ListHeaderExtra)
      mixinClazz = hierarchy.getClass(mixinClazz.extends)
    }
    return presenterMixin.presenters
  }

  $: flat = Object.values(groupedDocs).flat(1)

  export function select (offset: 1 | -1 | 0, of?: Doc): void {
    let pos = (of !== undefined ? flat.findIndex((it) => it._id === of._id) : selectedRowIndex) ?? -1
    pos += offset
    if (pos < 0) {
      pos = 0
    }
    if (pos >= flat.length) {
      pos = flat.length - 1
    }
    const r = objectRefs[pos]
    selectedRowIndex = pos
    onRow(flat[pos])
    if (r !== undefined) {
      r?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }

  function onRow (object: Doc): void {
    dispatch('row-focus', object)
  }

  $: objectRefs.length = flat.length
</script>

<div class="list-container">
  {#each categories as category, i}
    {@const items = groupedDocs[category] ?? []}
    <ListCategory
      bind:selectedRowIndex
      {extraHeaders}
      {space}
      {selectedObjectIds}
      {headerComponent}
      initIndex={getInitIndex(categories, i)}
      {baseMenuClass}
      {groupByKey}
      {itemModels}
      singleCat={categories.length === 1}
      {category}
      {items}
      {createItemDialog}
      {createItemLabel}
      loadingPropsLength={getLoadingElementsLength(loadingProps, options)}
      on:check
      on:uncheckAll={uncheckAll}
      on:row-focus
      {flatHeaders}
      {props}
    />
  {/each}
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
