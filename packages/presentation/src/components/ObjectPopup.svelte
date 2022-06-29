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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
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
    Tooltip
  } from '@anticrm/ui'
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import presentation from '..'
  import { createQuery, getClient } from '../utils'
  import { ObjectCreate } from '../types'

  export let _class: Ref<Class<Doc>>
  export let options: FindOptions<Doc> | undefined = undefined
  export let selected: Ref<Doc> | undefined = undefined

  export let docQuery: DocumentQuery<Doc> | undefined = undefined

  export let multiSelect: boolean = false
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

  let search: string = ''
  let objects: Doc[] = []

  $: selectedElements = new Set(selectedObjects)

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query<Doc>(
    _class,
    {
      ...(docQuery ?? {}),
      [searchField]: { $like: '%' + search + '%' },
      _id: { $nin: ignoreObjects }
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

  const checkSelected = (person: Doc, objects: Doc[]): void => {
    if (selectedElements.has(person._id)) {
      selectedElements.delete(person._id)
    } else {
      selectedElements.add(person._id)
    }

    selectedObjects = Array.from(selectedElements)

    dispatch('update', selectedObjects)
  }

  const client = getClient()

  let selection = 0
  let list: ListView

  async function handleSelection (evt: Event | undefined, objects: Doc[], selection: number): Promise<void> {
    const person = objects[selection]

    if (!multiSelect) {
      selected = person._id === selected ? undefined : person._id
      dispatch('close', selected !== undefined ? person : undefined)
    } else {
      checkSelected(person, objects)
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

  afterUpdate(() => dispatch('changeContent'))
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  class:full-width={width === 'full'}
  class:plainContainer={!shadows}
  class:width-40={width === 'large'}
  on:keydown={onKeydown}
>
  <div class="header flex-between">
    <EditBox kind={'search-style'} focusIndex={1} focus bind:value={search} {placeholder} />
    {#if create !== undefined}
      <div class="mx-2">
        <Button
          focusIndex={2}
          kind={'transparent'}
          {size}
          icon={IconAdd}
          showTooltip={{ label: create.label }}
          on:click={onCreate}
        />
      </div>
    {/if}
  </div>
  <div class="scroll">
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
            class="menu-item w-full"
            on:click={() => {
              handleSelection(undefined, objects, item)
            }}
          >
            {#if allowDeselect && selected}
              <div class="icon">
                {#if obj._id === selected}
                  {#if titleDeselect}
                    <Tooltip label={titleDeselect ?? presentation.string.Deselect}>
                      <Icon icon={IconCheck} {size} />
                    </Tooltip>
                  {:else}
                    <Icon icon={IconCheck} {size} />
                    <!-- <CheckBox checked circle primary /> -->
                  {/if}
                {/if}
              </div>
            {/if}

            <span class="label">
              <slot name="item" item={obj} />
            </span>
            {#if multiSelect}
              <div class="check pointer-events-none">
                <CheckBox checked={selectedElements.has(obj._id)} primary />
              </div>
            {/if}
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
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
