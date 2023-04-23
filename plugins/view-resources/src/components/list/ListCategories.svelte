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
  import { CategoryType, Class, Doc, DocumentQuery, generateId, Lookup, Ref, Space } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { getClient, statusStore } from '@hcengineering/presentation'
  import { AnyComponent } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, CategoryOption, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher, onDestroy, SvelteComponentTyped } from 'svelte'
  import {
    buildModel,
    concatCategories,
    getAdditionalHeader,
    getCategories,
    getGroupByValues,
    getPresenter,
    groupBy
  } from '../../utils'
  import { CategoryQuery, noCategory } from '../../viewOptions'
  import ListCategory from './ListCategory.svelte'

  export let docs: Doc[]
  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc> | undefined
  export let lookup: Lookup<Doc>
  export let loadingPropsLength: number | undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined
  export let config: (string | BuildModelKey)[]
  export let selectedObjectIds: Doc[] = []
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}
  export let level: number
  export let initIndex = 0
  export let newObjectProps: (doc: Doc) => Record<string, any> | undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let dragItem: {
    doc?: Doc
    revert?: () => void
  }
  export let listDiv: HTMLDivElement
  export let selection: number | undefined = undefined

  $: groupByKey = viewOptions.groupBy[level] ?? noCategory
  let categories: CategoryType[] = []
  $: updateCategories(_class, docs, groupByKey, viewOptions, viewOptionsConfig)

  $: groupByDocs = groupBy(docs, groupByKey, categories)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const queryId = generateId()
  onDestroy(() => {
    CategoryQuery.remove(queryId)
  })

  function update () {
    updateCategories(_class, docs, groupByKey, viewOptions, viewOptionsConfig)
  }

  async function updateCategories (
    _class: Ref<Class<Doc>>,
    docs: Doc[],
    groupByKey: string,
    viewOptions: ViewOptions,
    viewOptionsModel: ViewOptionModel[] | undefined
  ) {
    categories = await getCategories(client, _class, docs, groupByKey, $statusStore)
    if (level === 0) {
      for (const viewOption of viewOptionsModel ?? []) {
        if (viewOption.actionTarget !== 'category') continue
        const categoryFunc = viewOption as CategoryOption
        if (viewOptions[viewOption.key] ?? viewOption.defaultValue) {
          const f = await getResource(categoryFunc.action)
          const res = hierarchy.clone(await f(_class, query, groupByKey, update, queryId, $statusStore))
          if (res !== undefined) {
            categories = concatCategories(res, categories)
            return
          }
        }
      }
    }
  }

  let itemModels: AttributeModel[]

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
    let res = initIndex
    for (let index = 0; index < i; index++) {
      const cat = categories[index]
      res += groupByDocs[cat]?.length ?? 0
    }
    return res
  }

  $: extraHeaders = getAdditionalHeader(client, _class)

  const dispatch = createEventDispatcher()

  function getState (doc: Doc): number {
    let pos = 0
    for (const st of categories) {
      const stateObjs = getGroupByValues(groupByDocs, st) ?? []
      if (stateObjs.findIndex((it) => it._id === doc._id) !== -1) {
        return pos
      }
      pos++
    }
    return -1
  }

  export function select (offset: 1 | -1 | 0, of?: Doc, dir?: 'vertical' | 'horizontal'): void {
    let pos = (of != null ? docs.findIndex((it) => it._id === of._id) : selection) ?? -1
    if (pos === -1) {
      for (const st of categories) {
        const stateObjs = getGroupByValues(groupByDocs, st) ?? []
        if (stateObjs.length > 0) {
          pos = docs.findIndex((it) => it._id === stateObjs[0]._id)
          break
        }
      }
    }

    if (pos < 0) {
      pos = 0
    }
    if (pos >= docs.length) {
      pos = docs.length - 1
    }

    const obj = docs[pos]
    if (obj === undefined) {
      return
    }

    // We found group
    const objState = getState(obj)
    if (objState === -1) {
      return
    }

    if (level + 1 >= viewOptions.groupBy.length) {
      const stateObjs = getGroupByValues(groupByDocs, categories[objState]) ?? []

      const statePos = stateObjs.findIndex((it) => it._id === obj._id)
      if (statePos === undefined) {
        return
      }

      console.log(statePos, objState, offset)
      if (offset === -1) {
        if (dir === undefined || dir === 'vertical') {
          if (statePos - 1 < 0 && objState > 0) {
            const pstateObjs = getGroupByValues(groupByDocs, categories[objState - 1]) ?? []
            dispatch('select', pstateObjs[pstateObjs.length - 1])
          } else {
            const obj = stateObjs[statePos - 1] ?? stateObjs[0]
            scrollInto(objState, obj)
            dispatch('row-focus', obj)
          }
          return
        }
      }
      if (offset === 1) {
        if (dir === undefined || dir === 'vertical') {
          if (statePos + 1 >= stateObjs.length && objState < categories.length) {
            const pstateObjs = getGroupByValues(groupByDocs, categories[objState + 1]) ?? []
            if (pstateObjs[0] !== undefined) {
              dispatch('select', pstateObjs[0])
            }
          } else {
            const obj = stateObjs[statePos + 1] ?? stateObjs[stateObjs.length - 1]
            scrollInto(objState, obj)
            dispatch('row-focus', obj)
          }
          return
        }
      }
      if (offset === 0) {
        // scrollInto(objState, obj)
        dispatch('row-focus', obj)
      }
    } else {
      listCategory[objState]?.select(offset, of, dir)
    }
  }
  function scrollInto (statePos: number, obj: Doc): void {
    // listCategory[statePos]?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    listListCategory[statePos]?.scroll(obj)
    listCategory[statePos]?.scroll(obj)
  }

  const listCategory: SvelteComponentTyped[] = []
  const listListCategory: ListCategory[] = []
</script>

{#each categories as category, i (typeof category === 'object' ? category.name : category)}
  {@const items = groupByKey === noCategory ? docs : getGroupByValues(groupByDocs, category)}
  <ListCategory
    bind:this={listListCategory[i]}
    {extraHeaders}
    {space}
    {selectedObjectIds}
    {headerComponent}
    {baseMenuClass}
    {level}
    {viewOptions}
    {groupByKey}
    {lookup}
    {config}
    {itemModels}
    {_class}
    singleCat={level === 0 && categories.length === 1}
    oneCat={viewOptions.groupBy.length === 1}
    lastCat={i === categories.length - 1}
    {category}
    {items}
    {newObjectProps}
    {createItemDialog}
    {createItemLabel}
    {loadingPropsLength}
    {viewOptionsConfig}
    on:check
    on:uncheckAll
    on:row-focus
    on:dragstart={(e) => {
      dispatch('dragstart', {
        target: e.detail.target,
        index: e.detail.index + getInitIndex(categories, i)
      })
    }}
    {flatHeaders}
    {disableHeader}
    {props}
    {listDiv}
    bind:dragItem
  >
    <svelte:fragment
      slot="category"
      let:docs
      let:_class
      let:space
      let:lookup
      let:loadingPropsLength
      let:baseMenuClass
      let:config
      let:selectedObjectIds
      let:createItemDialog
      let:createItemLabel
      let:viewOptions
      let:newObjectProps
      let:flatHeaders
      let:props
      let:level
      let:viewOptionsConfig
      let:listDiv
      let:dragstart
    >
      <svelte:self
        {docs}
        bind:this={listCategory[i]}
        {_class}
        {space}
        {lookup}
        {loadingPropsLength}
        {baseMenuClass}
        {config}
        {selectedObjectIds}
        {createItemDialog}
        {createItemLabel}
        {viewOptions}
        {newObjectProps}
        {flatHeaders}
        {props}
        {level}
        {initIndex}
        {viewOptionsConfig}
        {listDiv}
        on:dragItem
        on:check
        on:uncheckAll
        on:row-focus
        on:dragstart={dragstart}
        on:select={(evt) => {
          select(0, evt.detail)
        }}
      />
    </svelte:fragment>
  </ListCategory>
{/each}
