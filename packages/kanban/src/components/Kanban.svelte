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
  import { Class, Doc, DocumentQuery, DocumentUpdate, FindOptions, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getPlatformColor, ScrollBox, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { CardDragEvent, ExtItem, Item, StateType, TypeState } from '../types'
  import { calcRank } from '../utils'
  import KanbanRow from './KanbanRow.svelte'

  export let _class: Ref<Class<Item>>
  export let options: FindOptions<Item> | undefined = undefined
  export let states: TypeState[] = []
  export let query: DocumentQuery<Item> = {}
  export let fieldName: string
  export let selection: number | undefined = undefined
  export let checked: Doc[] = []
  export let dontUpdateRank: boolean = false

  const dispatch = createEventDispatcher()

  let objects: Item[] = []

  const objsQ = createQuery()
  $: objsQ.query(
    _class,
    query,
    (result) => {
      objects = result
      dispatch('content', objects)
    },
    {
      sort: { rank: SortingOrder.Ascending },
      ...options
    }
  )

  function getStateObjects (
    objects: Item[],
    state: TypeState,
    dragItem?: Item // required for svelte to properly recalculate state.
  ): ExtItem[] {
    const stateCards = objects.filter((it) => (it as any)[fieldName] === state._id)
    return stateCards.map((it, idx, arr) => ({
      it,
      prev: arr[idx - 1],
      next: arr[idx + 1],
      pos: objects.findIndex((pi) => pi._id === it._id)
    }))
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

    if (!dontUpdateRank && dragCardInitialRank !== dragCard.rank) {
      const dragCardRank = dragCard.rank
      updates = {
        ...updates,
        rank: dragCardRank
      }
    }
    if (Object.keys(updates).length > 0) {
      await client.update(dragCard, updates)
    }
    dragCard = undefined
  }

  const client = getClient()

  let dragCard: Item | undefined
  let dragCardInitialRank: string | undefined
  let dragCardInitialState: StateType

  let isDragging = false

  async function updateDone (query: DocumentUpdate<Item>): Promise<void> {
    isDragging = false
    if (dragCard === undefined) {
      return
    }
    await client.update(dragCard, query)
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

  function panelDragOver (event: Event, state: TypeState): void {
    event.preventDefault()
    const card = dragCard as any
    if (card !== undefined && card[fieldName] !== state._id) {
      card[fieldName] = state._id
      const objs = getStateObjects(objects, state)
      if (!dontUpdateRank) {
        card.rank = calcRank(objs[objs.length - 1]?.it, undefined)
      }
    }
  }
  function cardDragOver (evt: CardDragEvent, object: ExtItem): void {
    if (dragCard !== undefined && !dontUpdateRank) {
      dragCard.rank = doCalcRank(object, evt)
    }
  }
  function cardDrop (evt: CardDragEvent, object: ExtItem): void {
    if (!dontUpdateRank && dragCard !== undefined) {
      dragCard.rank = doCalcRank(object, evt)
    }
    isDragging = false
  }
  function onDragStart (object: ExtItem, state: TypeState): void {
    dragCardInitialState = state._id
    dragCardInitialRank = object.it.rank
    dragCard = object.it
    isDragging = true
    dispatch('obj-focus', object.it)
  }
  // eslint-disable-next-line
  let dragged: boolean = false

  function toAny (object: any): any {
    return object
  }

  // eslint-disable-next-line no-unused-vars
  let stateObjects: ExtItem[]

  const stateRefs: HTMLElement[] = []
  const stateRows: KanbanRow[] = []

  $: stateRefs.length = states.length
  $: stateRows.length = states.length

  function scrollInto (statePos: number, obj: Item): void {
    stateRefs[statePos]?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    stateRows[statePos]?.scroll(obj)
  }

  export function select (offset: 1 | -1 | 0, of?: Doc, dir?: 'vertical' | 'horizontal'): void {
    let pos = (of !== undefined ? objects.findIndex((it) => it._id === of._id) : selection) ?? -1
    if (pos === -1) {
      for (const st of states) {
        const stateObjs = getStateObjects(objects, st)
        if (stateObjs.length > 0) {
          pos = objects.findIndex((it) => it._id === stateObjs[0].it._id)
          break
        }
      }
    }

    if (pos < 0) {
      pos = 0
    }
    if (pos >= objects.length) {
      pos = objects.length - 1
    }

    const obj = objects[pos]
    if (obj === undefined) {
      return
    }
    const fState = (obj as any)[fieldName]
    let objState = states.findIndex((it) => it._id === fState)
    if (objState === -1) {
      return
    }
    const stateObjs = getStateObjects(objects, states[objState])
    const statePos = stateObjs.findIndex((it) => it.it._id === obj._id)
    if (statePos === undefined) {
      return
    }

    if (offset === -1) {
      if (dir === undefined || dir === 'vertical') {
        const obj = (stateObjs[statePos - 1] ?? stateObjs[0]).it
        scrollInto(objState, obj)
        dispatch('obj-focus', obj)
        return
      } else {
        while (objState > 0) {
          objState--
          const nstateObjs = getStateObjects(objects, states[objState])
          if (nstateObjs.length > 0) {
            const obj = (nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]).it
            scrollInto(objState, obj)
            dispatch('obj-focus', obj)
            break
          }
        }
      }
    }
    if (offset === 1) {
      if (dir === undefined || dir === 'vertical') {
        const obj = (stateObjs[statePos + 1] ?? stateObjs[stateObjs.length - 1]).it
        scrollInto(objState, obj)
        dispatch('obj-focus', obj)
        return
      } else {
        while (objState < states.length - 1) {
          objState++
          const nstateObjs = getStateObjects(objects, states[objState])
          if (nstateObjs.length > 0) {
            const obj = (nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]).it
            scrollInto(objState, obj)
            dispatch('obj-focus', obj)
            break
          }
        }
      }
    }
    if (offset === 0) {
      scrollInto(objState, obj)
      dispatch('obj-focus', obj)
    }
  }

  $: checkedSet = new Set<Ref<Doc>>(checked.map((it) => it._id))

  export function check (docs: Doc[], value: boolean) {
    dispatch('check', { docs, value })
  }
  const showMenu = async (evt: MouseEvent, object: ExtItem): Promise<void> => {
    selection = object.pos
    if (!checkedSet.has(object.it._id)) {
      check(objects, false)
      checked = []
    }
    dispatch('contextmenu', { evt, objects: checked.length > 0 ? checked : object.it })
  }
</script>

<div class="kanban-container top-divider">
  <ScrollBox>
    <div class="kanban-content">
      {#each states as state, si (state._id)}
        {@const stateObjects = getStateObjects(objects, state, dragCard)}

        <div
          class="panel-container step-lr75"
          bind:this={stateRefs[si]}
          on:dragover={(event) => panelDragOver(event, state)}
          on:drop={() => {
            move(state._id)
            isDragging = false
          }}
        >
          {#if $$slots.header !== undefined}
            <slot name="header" state={toAny(state)} count={stateObjects.length} />
          {:else}
            <div class="header">
              <div class="bar" style="background-color: {getPlatformColor(state.color)}" />
              <div class="flex-between label">
                <div>
                  <span class="lines-limit-2">{state.title}</span>
                </div>
              </div>
            </div>
          {/if}
          <Scroller padding={'.5rem 0'} on:dragover on:drop>
            <slot name="beforeCard" {state} />
            <KanbanRow
              bind:this={stateRows[si]}
              on:obj-focus
              {stateObjects}
              {isDragging}
              {dragCard}
              {objects}
              {selection}
              {checkedSet}
              {state}
              {cardDragOver}
              {cardDrop}
              {onDragStart}
              {showMenu}
            >
              <svelte:fragment slot="card" let:object let:dragged>
                <slot name="card" {object} {dragged} />
              </svelte:fragment>
            </KanbanRow>

            <slot name="afterCard" {state} />
          </Scroller>
        </div>
      {/each}
      <slot name="afterPanel" />
    </div>
  </ScrollBox>
  {#if isDragging}
    <slot name="doneBar" onDone={updateDone} />
  {/if}
</div>

<style lang="scss">
  .kanban-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--board-bg-color);
  }
  .kanban-content {
    display: flex;
    padding: 1.5rem 2rem 0;
  }

  @keyframes anim-border {
    from {
      box-shadow: inset 0 0 1px 1px var(--primary-edit-border-color);
    }
    to {
      box-shadow: inset 0 0 1px 1px var(--primary-bg-color);
    }
  }

  .panel-container {
    display: flex;
    flex-direction: column;
    width: 20rem;
    min-width: 20rem;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;

    .header {
      display: flex;
      flex-direction: column;
      height: 4rem;
      min-height: 4rem;

      .bar {
        height: 0.375rem;
        border-radius: 0.25rem;
      }
      .label {
        padding: 0 0.5rem 0 1rem;
        height: 100%;
        font-weight: 500;
        color: var(--theme-caption-color);
      }
    }
  }
</style>
