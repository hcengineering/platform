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
  import { IntlString } from '@hcengineering/platform'
  import {
    AnyComponent,
    CheckBox,
    ExpandCollapse,
    getEventPositionElement,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FocusSelection, focusStore } from '../../selection'
  import Menu from '../Menu.svelte'
  import ListCategories from './ListCategories.svelte'
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
  export let extraHeaders: AnyComponent[] | undefined
  export let flatHeaders = false
  export let props: Record<string, any> = {}
  export let level: number
  export let elementByIndex: Map<number, HTMLDivElement>
  export let indexById: Map<Ref<Doc>, number>
  export let lookup: Lookup<Doc>
  export let _class: Ref<Class<Doc>>
  export let config: (string | BuildModelKey)[]
  export let viewOptions: ViewOptions
  export let newObjectProps: Record<string, any>
  export let docByIndex: Map<number, Doc>

  $: lastLevel = level + 1 >= viewOptions.groupBy.length

  const autoFoldLimit = 20
  const defaultLimit = 20
  const singleCategoryLimit = 200
  $: initialLimit = !lastLevel ? items.length : singleCat ? singleCategoryLimit : defaultLimit
  $: limit = initialLimit

  let collapsed = true

  const dispatch = createEventDispatcher()

  function limitGroup (items: Doc[], limit: number): Doc[] {
    return items.slice(0, limit)
  }

  function initCollapsed (singleCat: boolean, lastLevel: boolean, category: any): void {
    collapsed = !singleCat && items.length > (lastLevel ? autoFoldLimit : singleCategoryLimit)
  }

  $: initCollapsed(singleCat, lastLevel, category)

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  const handleMenuOpened = async (event: MouseEvent, object: Doc, rowIndex: number) => {
    event.preventDefault()
    handleRowFocused(object)

    if (!selectedObjectIdsSet.has(object._id)) {
      dispatch('uncheckAll')
    }

    const items = selectedObjectIds.length > 0 ? selectedObjectIds : object

    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(event), () => {
      dispatch('row-focus')
    })
  }

  $: limited = limitGroup(items, limit)
  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))

  $: newObjectProps = { [groupByKey]: category, ...newObjectProps }

  function isSelected (doc: Doc, focusStore: FocusSelection): boolean {
    return focusStore.focus?._id === doc._id
  }
</script>

<ListHeader
  {groupByKey}
  {category}
  {space}
  {level}
  limited={limited.length}
  {items}
  {headerComponent}
  {createItemDialog}
  {createItemLabel}
  {extraHeaders}
  {newObjectProps}
  flat={flatHeaders}
  {props}
  on:more={() => {
    limit += 20
  }}
  on:collapse={() => {
    collapsed = !collapsed
  }}
/>
<ExpandCollapse isExpanded={!collapsed} duration={400}>
  {#if !lastLevel}
    <div class="p-2">
      <ListCategories
        {elementByIndex}
        {indexById}
        docs={items}
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
        level={level + 1}
        {initIndex}
        {docByIndex}
        on:check
        on:uncheckAll
        on:row-focus
      />
    </div>
  {:else if itemModels}
    {#if limited}
      {#each limited as docObject, i (docObject._id)}
        <ListItem
          {docObject}
          {elementByIndex}
          {docByIndex}
          {indexById}
          model={itemModels}
          index={initIndex + i}
          {groupByKey}
          selected={isSelected(docObject, $focusStore)}
          checked={selectedObjectIdsSet.has(docObject._id)}
          on:check={(ev) => dispatch('check', { docs: ev.detail.docs, value: ev.detail.value })}
          on:contextmenu={(event) => handleMenuOpened(event, docObject, initIndex + i)}
          on:focus={() => {}}
          on:mouseover={() => handleRowFocused(docObject)}
          {props}
        />
      {/each}
    {/if}
  {:else if loadingPropsLength !== undefined}
    {#each Array(Math.max(loadingPropsLength, limit)) as _, rowIndex}
      <div class="listGrid row">
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
