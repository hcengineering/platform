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
    AnyComponent,
    Button,
    CheckBox,
    createFocusManager,
    EditBox,
    FocusHandler,
    IconAdd,
    ListView,
    showPopup,
    Tooltip
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { createQuery, getClient } from '../utils'

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

  export let searchField: string = 'name'

  export let create:
    | {
        component: AnyComponent
        label: IntlString
        update: (doc: Doc) => string
      }
    | undefined

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
      objects = result
    },
    { ...(options ?? {}), limit: 200 }
  )

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
          search = c.update(newPerson)
        }
      }
    })
  }
</script>

<FocusHandler {manager} />

<div class="selectPopup" class:plainContainer={!shadows} on:keydown={onKeydown}>
  <div class="header flex-row-center flex-bletween p-1">
    <div class="flex-grow">
      <EditBox kind={'search-style'} focusIndex={1} focus bind:value={search} {placeholder} />
    </div>

    {#if create !== undefined}
      <Tooltip label={create.label}>
        <Button focusIndex={2} kind={'transparent'} icon={IconAdd} on:click={onCreate} />
      </Tooltip>
    {/if}
  </div>
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={objects.length} bind:selection>
        <svelte:fragment slot="item" let:item>
          {@const obj = objects[item]}
          <button
            class="menu-item w-full"
            on:click={() => {
              handleSelection(undefined, objects, item)
            }}
          >
            {#if multiSelect}
              <div class="check pointer-events-none">
                <CheckBox checked={selectedElements.has(obj._id)} primary />
              </div>
            {/if}

            <slot name="item" item={obj} />

            {#if allowDeselect && obj._id === selected}
              <div class="check-right pointer-events-none">
                {#if titleDeselect}
                  <Tooltip label={titleDeselect ?? presentation.string.Deselect}>
                    <CheckBox checked circle primary />
                  </Tooltip>
                {:else}
                  <CheckBox checked circle primary />
                {/if}
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
