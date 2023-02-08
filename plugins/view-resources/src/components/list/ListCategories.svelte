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
  import { Class, Doc, Lookup, Ref, Space } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, CategoryOption, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { buildModel, getAdditionalHeader, getCategories, getPresenter, groupBy } from '../../utils'
  import { noCategory } from '../../viewOptions'
  import ListCategory from './ListCategory.svelte'

  export let elementByIndex: Map<number, HTMLDivElement>
  export let indexById: Map<Ref<Doc>, number>
  export let docs: Doc[]
  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
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
  export let newObjectProps: Record<string, any>
  export let docByIndex: Map<number, Doc>
  export let viewOptionsConfig: ViewOptionModel[] | undefined

  $: groupByKey = viewOptions.groupBy[level] ?? noCategory
  $: groupedDocs = groupBy(docs, groupByKey)
  let categories: any[] = []
  $: updateCategories(_class, docs, groupByKey, viewOptions, viewOptionsConfig)

  async function updateCategories (
    _class: Ref<Class<Doc>>,
    docs: Doc[],
    groupByKey: string,
    viewOptions: ViewOptions,
    viewOptionsModel: ViewOptionModel[] | undefined
  ) {
    categories = await getCategories(client, _class, docs, groupByKey)
    if (level === 0) {
      for (const viewOption of viewOptionsModel ?? []) {
        if (viewOption.actionTartget !== 'category') continue
        const categoryFunc = viewOption as CategoryOption
        if (viewOptions[viewOption.key] ?? viewOption.defaultValue) {
          const f = await getResource(categoryFunc.action)
          const res = await f(_class, space, groupByKey)
          if (res !== undefined) {
            for (const category of categories) {
              if (!res.includes(category)) {
                res.push(category)
              }
            }
            categories = res
            return
          }
        }
      }
    }
  }

  const client = getClient()

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
      res += groupedDocs[cat]?.length
    }
    return res
  }

  $: extraHeaders = getAdditionalHeader(client, _class)
</script>

{#each categories as category, i}
  {@const items = groupedDocs[category] ?? []}
  {#key category}
    <ListCategory
      {elementByIndex}
      {indexById}
      {extraHeaders}
      {space}
      {selectedObjectIds}
      {headerComponent}
      initIndex={getInitIndex(categories, i)}
      {baseMenuClass}
      {level}
      {viewOptions}
      {groupByKey}
      {config}
      {docByIndex}
      {itemModels}
      {_class}
      singleCat={level === 0 && categories.length === 1}
      {category}
      {items}
      {newObjectProps}
      {createItemDialog}
      {createItemLabel}
      {loadingPropsLength}
      on:check
      on:uncheckAll
      on:row-focus
      {flatHeaders}
      {disableHeader}
      {props}
    />
  {/key}
{/each}
