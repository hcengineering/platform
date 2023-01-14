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
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import {
    AnyComponent,
    CheckBox,
    ExpandCollapse,
    getEventPositionElement,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import Menu from '../Menu.svelte'
  import ListHeader from './ListHeader.svelte'
  import ListItem from './ListItem.svelte'

  export let category: any
  export let headerComponent: AttributeModel | undefined
  export let singleCat: boolean
  export let groupByKey: string
  export let space: Ref<Space> | undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined
  export let items: Doc[]
  export let initIndex: number
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString | undefined
  export let loadingPropsLength: number | undefined
  export let selectedObjectIds: Doc[]
  export let itemModels: AttributeModel[]
  export let selectedRowIndex: number | undefined
  export let extraHeaders: AnyComponent[] | undefined
  export let objectRefs: HTMLElement[] = []

  const autoFoldLimit = 20
  const defaultLimit = 20
  const singleCategoryLimit = 200
  $: initialLimit = singleCat ? singleCategoryLimit : defaultLimit
  $: limit = initialLimit

  const dispatch = createEventDispatcher()

  function limitGroup (items: Doc[], limit: number): Doc[] {
    return items.slice(0, limit)
  }

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  const handleMenuOpened = async (event: MouseEvent, object: Doc, rowIndex: number) => {
    event.preventDefault()
    selectedRowIndex = rowIndex

    if (!selectedObjectIdsSet.has(object._id)) {
      dispatch('uncheckAll')
    }

    const items = selectedObjectIds.length > 0 ? selectedObjectIds : object

    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(event), () => {
      selectedRowIndex = undefined
    })
  }

  $: collapsed = !singleCat && items.length > autoFoldLimit
  $: limited = limitGroup(items, limit)
  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))
</script>

<ListHeader
  {groupByKey}
  {category}
  {space}
  limited={limited.length}
  {items}
  {headerComponent}
  {createItemDialog}
  {createItemLabel}
  {extraHeaders}
  on:more={() => {
    limit += 20
  }}
  on:collapse={() => {
    collapsed = !collapsed
  }}
/>
<ExpandCollapse isExpanded={!collapsed} duration={400}>
  {#if itemModels}
    {#if limited}
      {#each limited as docObject, i (docObject._id)}
        <ListItem
          bind:use={objectRefs[initIndex + i]}
          {docObject}
          model={itemModels}
          {groupByKey}
          selected={selectedRowIndex === initIndex + i}
          checked={selectedObjectIdsSet.has(docObject._id)}
          on:check={(ev) => dispatch('check', { docs: ev.detail.docs, value: ev.detail.value })}
          on:contextmenu={(event) => handleMenuOpened(event, docObject, initIndex + i)}
          on:focus={() => {}}
          on:mouseover={() => handleRowFocused(docObject)}
        />
      {/each}
    {/if}
  {:else if loadingPropsLength !== undefined}
    {#each Array(Math.max(loadingPropsLength, limit)) as _, rowIndex}
      <div class="listGrid row" class:fixed={rowIndex === selectedRowIndex}>
        <div class="flex-center clear-mins h-full">
          <div class="gridElement">
            <CheckBox checked={false} />
            <div class="ml-4">
              <Spinner size="small" />
            </div>
          </div>
        </div>
      </div>
    {/each}
  {/if}
</ExpandCollapse>

<style lang="scss">
  .row:not(:last-child) {
    border-bottom: 1px solid var(--accent-bg-color);
  }
</style>
