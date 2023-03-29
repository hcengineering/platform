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
  import { CategoryType, Doc, DocumentUpdate, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getPlatformColor, ScrollBox, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { CardDragEvent, Item, StateType, TypeState } from '../types'
  import KanbanRow from './KanbanRow.svelte'

  export let states: TypeState[] = []
  export let objects: Item[] = []
  export let objectByState: Record<StateType, Item[]>
  export let fieldName: string

  export let selection: number | undefined = undefined
  export let checked: Doc[] = []
  export let dontUpdateRank: boolean = false
  export let getState: (field: string, doc: Item)=> StateType

  const dispatch = createEventDispatcher()


  async function move (state: CategoryType) {
    if (dragCard === undefined) {
      return
    }
    // let updates: DocumentUpdate<Item> = {}

    // if (dragCardInitialState !== state) {
    //   updates = {
    //     ...updates,
    //     [fieldName]: valueSelector?.(state, dragCard) ?? state
    //   }
    // }

    // if (!dontUpdateRank && dragCardInitialRank !== dragCard.rank) {
    //   const dragCardRank = dragCard.rank
    //   updates = {
    //     ...updates,
    //     rank: dragCardRank
    //   }
    // }
    // if (Object.keys(updates).length > 0) {
    //   await client.update(dragCard, updates)
    // }
    dragCard = undefined
  }

  const client = getClient()

  let dragCard: Item | undefined
  let dragCardInitialRank: string | undefined
  let dragCardInitialState: CategoryType

  let isDragging = false

  async function updateDone (updateValue: DocumentUpdate<Item>): Promise<void> {
    isDragging = false
    if (dragCard === undefined) {
      return
    }
    await client.update(dragCard, updateValue)
  }
  
  function panelDragOver (event: Event, state: TypeState): void {
    event.preventDefault()
    const card = dragCard as any
    if (card !== undefined && getState(fieldName, card) !== state._id) {
      // const index = oldArr.findIndex((p) => p._id === card._id)
      // if (index !== -1) {
      //   objectByState[getState(fieldName, card)] = oldArr
      // }
      // card[getState(fieldName, card)] = state._id

      // const arr = objectByState[getState(fieldName, card)] ?? []
      // arr.push(card)
      // objectByState[getState(fieldName, card)] = arr
      // objectByState = objectByState
    }
  }

  function dragswap (ev: MouseEvent, i: number, s: number): boolean {
    if (s === -1) return false
    if (i < s) {
      return ev.offsetY < (ev.target as HTMLElement).offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > (ev.target as HTMLElement).offsetHeight / 2
    }
    return false
  }

  function cardDragOver (evt: CardDragEvent, object: Item): void {
    if (dragCard !== undefined && !dontUpdateRank) {
      if (object._id !== dragCard._id) {
        // let arr = objectByState.get(getObjectValue(groupField, object)) ?? []
        // const dragCardIndex = arr.findIndex((p) => p._id === dragCard?._id)
        // const targetIndex = arr.findIndex((p) => p._id === object._id)
        // if (
        //   dragswap(evt, targetIndex, dragCardIndex) &&
        //   arr[targetIndex] !== undefined &&
        //   arr[dragCardIndex] !== undefined
        // ) {
        //   arr.splice(dragCardIndex, 1)
        //   arr = [...arr.slice(0, targetIndex), dragCard, ...arr.slice(targetIndex)]
        //   objectByState.set((object as any)[groupField], arr)
        //   objectByState = objectByState
        // }
      }
    }
  }
  function cardDrop (evt: CardDragEvent, object: Item): void {
    if (!dontUpdateRank && dragCard !== undefined) {
      // const arr = objectByState.get(getObjectValue(groupField, object)) ?? []
      // const s = arr.findIndex((p) => p._id === dragCard?._id)
      // if (s !== -1) {
      //   const newRank = calcRank(arr[s - 1], arr[s + 1])
      //   dragCard.rank = newRank
      // }
    }
    isDragging = false
  }
  function onDragStart (object: Item, state: TypeState): void {
    dragCardInitialState = state._id
    dragCardInitialRank = object.rank
    dragCard = object
    isDragging = true
    dispatch('obj-focus', object)
  }
  // eslint-disable-next-line
  let dragged: boolean = false

  function toAny (object: any): any {
    return object
  }

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
        const stateObjs = objectByState[st._id] ?? []
        if (stateObjs.length > 0) {
          pos = objects.findIndex((it) => it._id === stateObjs[0]._id)
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
    const fState = getState(fieldName, obj)
    let objState = states.findIndex((it) => it._id === fState)
    if (objState === -1) {
      return
    }
    const stateObjs = objectByState[states[objState]._id] ?? []
    const statePos = stateObjs.findIndex((it) => it._id === obj._id)
    if (statePos === undefined) {
      return
    }

    if (offset === -1) {
      if (dir === undefined || dir === 'vertical') {
        const obj = stateObjs[statePos - 1] ?? stateObjs[0]
        scrollInto(objState, obj)
        dispatch('obj-focus', obj)
        return
      } else {
        while (objState > 0) {
          objState--
          const nstateObjs = objectByState.get(states[objState]) ?? []
          if (nstateObjs.length > 0) {
            const obj = nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]
            scrollInto(objState, obj)
            dispatch('obj-focus', obj)
            break
          }
        }
      }
    }
    if (offset === 1) {
      if (dir === undefined || dir === 'vertical') {
        const obj = stateObjs[statePos + 1] ?? stateObjs[stateObjs.length - 1]
        scrollInto(objState, obj)
        dispatch('obj-focus', obj)
        return
      } else {
        while (objState < states.length - 1) {
          objState++
          const nstateObjs = objectByState[states[objState]._id] ?? []
          if (nstateObjs.length > 0) {
            const obj = nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]
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
  const showMenu = async (evt: MouseEvent, object: Item): Promise<void> => {
    selection = objects.findIndex((p) => p._id === object._id)
    if (!checkedSet.has(object._id)) {
      check(objects, false)
      checked = []
    }
    dispatch('contextmenu', { evt, objects: checked.length > 0 ? checked : object })
  }
</script>

<div class="kanban-container top-divider">
  <ScrollBox>
    <div class="kanban-content">
      {#each states as state, si (state._id)}
        {@const stateObjects = objectByState[state._id] ?? []}

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
        color: var(--caption-color);
      }
    }
  }
</style>
