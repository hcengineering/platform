<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import {
    Button,
    CheckBox,
    createFocusManager,
    EditBox,
    FocusHandler,
    Icon,
    IconAdd,
    IconCheck,
    ListView,
    showPopup,
    tooltip,
    resizeObserver,
    deviceOptionsStore
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { ObjectCreate } from '../types'
  import { createQuery, getClient } from '../utils'

  export let _class: Ref<Class<Doc>>
  export let options: FindOptions<Doc> | undefined = undefined
  export let selected: Ref<Doc> | undefined = undefined

  export let docQuery: DocumentQuery<Doc> | undefined = undefined

  export let multiSelect: boolean = false
  export let closeAfterSelect: boolean = true
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedObjects: Ref<Doc>[] = []
  export let ignoreObjects: Ref<Doc>[] = []
  export let shadows: boolean = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let size: 'small' | 'medium' | 'large' = 'small'

  export let searchField: string = 'name'

  export let groupBy = '_class'

  export let create: ObjectCreate | undefined = undefined
  export let readonly = false

  let search: string = ''
  let objects: Doc[] = []

  $: selectedElements = new Set(selectedObjects)

  const dispatch = createEventDispatcher()
  const query = createQuery()

  $: _idExtra = typeof docQuery?._id === 'object' ? docQuery?._id : {}
  $: query.query<Doc>(
    _class,
    {
      ...(docQuery ?? {}),
      [searchField]: { $like: '%' + search + '%' },
      _id: { $nin: ignoreObjects, ..._idExtra }
    },
    (result) => {
      result.sort((a, b) => {
        const aval: string = `${(a as any)[groupBy]}`
        const bval: string = `${(b as any)[groupBy]}`
        return aval.localeCompare(bval)
      })
      objects = result
    },
    { ...(options ?? {}), limit: 200 }
  )

  $: showCategories =
    objects.map((it) => (it as any)[groupBy]).filter((it, index, arr) => arr.indexOf(it) === index).length > 1

  const checkSelected = (item: Doc): void => {
    if (selectedElements.has(item._id)) {
      selectedElements.delete(item._id)
    } else {
      selectedElements.add(item._id)
    }

    selectedObjects = Array.from(selectedElements)

    dispatch('update', selectedObjects)
  }

  const client = getClient()

  let selection = 0
  let list: ListView

  async function handleSelection (evt: Event | undefined, objects: Doc[], selection: number): Promise<void> {
    const item = objects[selection]

    if (!multiSelect) {
      if (allowDeselect) {
        selected = item._id === selected ? undefined : item._id
      } else {
        selected = item._id
      }
      dispatch(closeAfterSelect ? 'close' : 'update', selected !== undefined ? item : undefined)
    } else {
      checkSelected(item)
    }
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, objects, selection)
    }
    if (key.code === 'Escape') {
      key.preventDefault()
      key.stopPropagation()
      dispatch('close')
    }
  }
  const manager = createFocusManager()

  function onCreate (): void {
    if (create === undefined) {
      return
    }
    const c = create
    showPopup(c.component, {}, 'top', async (res) => {
      if (res != null) {
        // We expect reference to new object.
        const newPerson = await client.findOne(_class, { _id: res })
        if (newPerson !== undefined) {
          search = c.update?.(newPerson) ?? ''
        }
      }
    })
  }
  function toAny (obj: any): any {
    return obj
  }

  let selectedDiv: HTMLElement | undefined
  let scrollDiv: HTMLElement | undefined
  let cHeight = 0

  const updateLocation = (scrollDiv?: HTMLElement, selectedDiv?: HTMLElement, objects?: Doc[], selected?: Ref<Doc>) => {
    const objIt = objects?.find((it) => it._id === selected)
    if (objIt === undefined) {
      cHeight = 0
      return
    }
    if (scrollDiv && selectedDiv) {
      const r = selectedDiv.getBoundingClientRect()
      const r2 = scrollDiv.getBoundingClientRect()
      if (r && r2) {
        if (r.top > r2.top && r.bottom < r2.bottom) {
          cHeight = 0
        } else {
          if (r.bottom < r2.bottom) {
            cHeight = 1
          } else {
            cHeight = -1
          }
        }
      }
    }
  }

  $: updateLocation(scrollDiv, selectedDiv, objects, selected)
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  class:full-width={width === 'full'}
  class:plainContainer={!shadows}
  class:width-40={width === 'large'}
  on:keydown={onKeydown}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div class="header flex-between">
    <EditBox
      kind={'search-style'}
      focusIndex={1}
      focus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      {placeholder}
    />
    {#if create !== undefined}
      <div class="mx-2">
        <Button
          focusIndex={2}
          kind={'transparent'}
          {size}
          icon={IconAdd}
          showTooltip={{ label: create.label }}
          on:click={onCreate}
          disabled={readonly}
        />
      </div>
    {/if}
  </div>
  {#if cHeight === 1}
    <div class="background-theme-content-accent" style:height={'2px'} />
  {/if}
  <div class="scroll" on:scroll={() => updateLocation(scrollDiv, selectedDiv, objects, selected)} bind:this={scrollDiv}>
    <div class="box">
      <ListView bind:this={list} count={objects.length} bind:selection>
        <svelte:fragment slot="category" let:item>
          {#if showCategories}
            {@const obj = toAny(objects[item])}
            {#if item === 0 || (item > 0 && toAny(objects[item - 1])[groupBy] !== obj[groupBy])}
              <!--Category for first item-->
              <div class="category-box">
                <slot name="category" item={obj} />
              </div>
            {/if}
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item>
          {@const obj = objects[item]}
          <button
            class="menu-item w-full flex-row-center"
            class:background-bg-focused={!allowDeselect && obj._id === selected}
            class:border-radius-1={!allowDeselect && obj._id === selected}
            disabled={readonly}
            on:click={() => {
              handleSelection(undefined, objects, item)
            }}
          >
            {#if allowDeselect && selected}
              <div class="icon" class:disabled={readonly}>
                {#if obj._id === selected}
                  <div bind:this={selectedDiv}>
                    {#if titleDeselect}
                      <div class="clear-mins" use:tooltip={{ label: titleDeselect ?? presentation.string.Deselect }}>
                        <Icon icon={IconCheck} {size} />
                      </div>
                    {:else}
                      <Icon icon={IconCheck} {size} />
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            <span class="label" class:disabled={readonly}>
              {#if obj._id === selected}
                <div bind:this={selectedDiv}>
                  <slot name="item" item={obj} />
                </div>
              {:else}
                <slot name="item" item={obj} />
              {/if}
            </span>
            {#if multiSelect}
              <div class="check-right pointer-events-none">
                <CheckBox checked={selectedElements.has(obj._id)} primary />
              </div>
            {/if}
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  {#if cHeight === -1}
    <div class="background-theme-content-accent" style:height={'2px'} />
  {/if}
</div>

<style lang="scss">
  .plainContainer {
    color: var(--caption-color);
    background-color: var(--body-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.25rem;
    box-shadow: none;
  }
</style>
