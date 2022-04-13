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
  import core, { AttachedDoc, Class, Doc, DocumentQuery, DocumentUpdate, FindOptions, Ref, Space } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { getPlatformColor, ScrollBox } from '@anticrm/ui'
  import { slide } from 'svelte/transition'
  import { DocWithRank } from '../types'
  import { calcRank } from '../utils'
  import KanbanPanel from './KanbanPanel.svelte'

  type StateType = any
  type Item = DocWithRank & { state: StateType; doneState: StateType | null }
  type TypeState = { _id: StateType; title: string; color: number }
  type ExtItem = { prev?: Item; it: Item; next?: Item }
  type CardDragEvent = DragEvent & { currentTarget: EventTarget & HTMLDivElement }

  export let _class: Ref<Class<Item>>
  export let space: Ref<Space>
  export let search: string
  export let options: FindOptions<Item> | undefined = undefined
  export let states: TypeState[] = []
  export let query: DocumentQuery<Item> = {}
  export let fieldName: string
  export let rankFieldName: string

  let objects: Item[] = []

  const objsQ = createQuery()
  $: objsQ.query(
    _class,
    {
      space,
      ...query,
      ...(search !== '' ? { $search: search } : {})
    },
    (result) => {
      objects = result
    },
    {
      ...options
    }
  )

  function getStateObjects (
    objects: Item[],
    state: TypeState,
    dragItem?: Item // required for svelte to properly recalculate state.
  ): ExtItem[] {
    const stateCards = objects.filter((it) => (it as any)[fieldName] === state._id)
    stateCards.sort((a, b) => (a as any)[rankFieldName]?.localeCompare((b as any)[rankFieldName]))
    return stateCards.map((it, idx, arr) => ({ it, prev: arr[idx - 1], next: arr[idx + 1] }))
  }

  async function updateItem (item: Item, update: DocumentUpdate<Item>) {
    if (client.getHierarchy().isDerived(_class, core.class.AttachedDoc)) {
      const adoc: AttachedDoc = item as Doc as AttachedDoc
      await client.updateCollection(
        _class,
        space,
        adoc._id as Ref<Doc> as Ref<AttachedDoc>,
        adoc.attachedTo,
        adoc.attachedToClass,
        adoc.collection,
        update
      )
    } else {
      await client.updateDoc(item._class, item.space, item._id, update)
    }
  }

  async function move (state: StateType) {
    if (dragCard === undefined) {
      return
    }
    let updates: DocumentUpdate<Item> = {}

    if (dragCardInitialState !== state) {
      updates = {
        ...updates,
        [fieldName]: state
      }
    }

    const dragCardRank = (dragCard as any)[rankFieldName]
    if (dragCardInitialRank !== (dragCard as any)[rankFieldName]) {
      updates = {
        ...updates,
        [rankFieldName]: dragCardRank
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateItem(dragCard, updates)
    }
    dragCard = undefined
  }

  const client = getClient()

  let dragCard: Item | undefined
  let dragCardInitialRank: string
  let dragCardInitialState: StateType

  let isDragging = false

  async function updateDone (query: DocumentUpdate<Item>): Promise<void> {
    isDragging = false
    if (dragCard === undefined) {
      return
    }
    await updateItem(dragCard, query)
  }
  function doCalcRank (
    object: { prev?: Item; it: Item; next?: Item },
    event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): string {
    const rect = event.currentTarget.getBoundingClientRect()

    if (event.clientY < rect.top + (rect.height * 2) / 3) {
      return calcRank(object.prev, object.it)
    } else {
      return calcRank(object.it, object.next)
    }
  }
  const slideD = (node: any, args: any) => (args.isDragging ? slide(node, args) : {})

  function panelDragOver (event: Event, state: TypeState): void {
    event.preventDefault()
    const card = dragCard as any
    if (card !== undefined && card[fieldName] !== state._id) {
      card[fieldName] = state._id
      const objs = getStateObjects(objects, state)
      card[rankFieldName] = calcRank(objs[objs.length - 1]?.it, undefined)
    }
  }
  function cardDragOver (evt: CardDragEvent, object: ExtItem): void {
    if (dragCard !== undefined) {
      ;(dragCard as any)[rankFieldName] = doCalcRank(object, evt)
    }
  }
  function cardDrop (evt: CardDragEvent, object: ExtItem): void {
    if (dragCard !== undefined) {
      ;(dragCard as any)[rankFieldName] = doCalcRank(object, evt)
    }
    isDragging = false
  }
  function onDragStart (object: ExtItem, state: TypeState): void {
    dragCardInitialState = state._id
    dragCardInitialRank = (object.it as any)[rankFieldName]
    dragCard = object.it
    isDragging = true
  }
  // eslint-disable-next-line
  let dragged: boolean = false

  function toAny (object: any): any {
    return object
  }

  // eslint-disable-next-line no-unused-vars
  let stateObjects: ExtItem[]
</script>

<div class="flex-col kanban-container">
  <div class="scrollable">
    <ScrollBox>
      <div class="kanban-content">
        {#each states as state}
          {@const stateObjects = getStateObjects(objects, state, dragCard)}
          <KanbanPanel
            label={state.title}
            color={getPlatformColor(state.color)}
            on:dragover={(event) => panelDragOver(event, state)}
            on:drop={() => {
              move(state._id)
              isDragging = false
            }}
            customHeader={$$slots.header !== undefined}
          >            
            <svelte:fragment slot='header'>
              <slot name="header" state={toAny(state)} count={stateObjects.length}/>
            </svelte:fragment>
            <slot name="beforeCard" {state} />
            {#each stateObjects as object}
              {@const dragged = isDragging && object.it._id === dragCard?._id}
              <div
                transition:slideD|local={{ isDragging }}
                class="step-tb75"
                on:dragover|preventDefault={(evt) => cardDragOver(evt, object)}
                on:drop|preventDefault={(evt) => cardDrop(evt, object)}
              >
                <div
                  class="card-container"
                  draggable={true}
                  class:draggable={true}
                  on:dragstart
                  on:dragend
                  class:dragged={dragged}
                  on:dragstart={() => onDragStart(object, state)}
                  on:dragend={() => {
                    isDragging = false
                  }}
                >
                  <slot name="card" object={toAny(object.it)} dragged={dragged} />
                </div>
              </div>
            {/each}
            <slot name="afterCard" {space} {state} />
          </KanbanPanel>
        {/each}
        <slot name="additionalPanel" />
      </div>
    </ScrollBox>
  </div>
  {#if isDragging}
    <slot name="doneBar" onDone={updateDone} />
  {/if}
</div>

<style lang="scss">
  .kanban-container {
    position: relative;
    height: 100%;
    background: var(--board-bg-color);
  }
  .kanban-content {
    display: flex;
    margin: 0.5rem 2rem;
    height: 100%;
  }

  .scrollable {
    height: 100%;
  }
  .card-container {
    background-color: var(--board-card-bg-color);
    border-radius: .25rem;
    user-select: none;

    &:hover { 
      background-color: var(--board-card-bg-hover); 
    }
    &.draggable {
      cursor: grab;
    }
    &.dragged {
      padding: 1rem;
      background-color: var(--board-bg-color);
    }
  }
</style>
