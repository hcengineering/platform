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
  import { ScrollBox, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { CardDragEvent, Item } from '../types'
  import { calcRank } from '../utils'
  import KanbanRow from './KanbanRow.svelte'

  export let categories: CategoryType[] = []
  export let objects: Item[] = []
  export let groupByDocs: Record<string | number, Item[]>
  export let getGroupByValues: (groupByDocs: Record<string | number, Item[]>, category: CategoryType) => Item[]
  export let setGroupByValues: (
    groupByDocs: Record<string | number, Item[]>,
    category: CategoryType,
    docs: Item[]
  ) => void

  export let selection: number | undefined = undefined
  export let checked: Doc[] = []
  export let dontUpdateRank: boolean = false

  export let getUpdateProps: (doc: Doc, state: CategoryType) => DocumentUpdate<Item> | undefined

  const dispatch = createEventDispatcher()

  async function move (state: CategoryType) {
    if (dragCard === undefined) {
      return
    }
    let updates = getUpdateProps(dragCard, state)

    if (updates === undefined) {
      panelDragLeave(undefined, dragCardState)
      return
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
  let dragCardInitialState: CategoryType
  let dragCardInitialPosition: number | undefined
  let dragCardState: CategoryType | undefined

  let isDragging = false

  async function updateDone (updateValue: DocumentUpdate<Item>): Promise<void> {
    isDragging = false
    if (dragCard === undefined) {
      return
    }
    await client.update(dragCard, updateValue)
  }

  function panelDragOver (event: Event | undefined, state: CategoryType): void {
    event?.preventDefault()
    if (dragCard !== undefined && dragCardState !== state) {
      const updates = getUpdateProps(dragCard, state)
      if (updates === undefined) {
        return
      }

      const oldArr = getGroupByValues(groupByDocs, dragCardState)
      const index = oldArr.findIndex((p) => p._id === dragCard?._id)
      if (index !== -1) {
        oldArr.splice(index, 1)
        setGroupByValues(groupByDocs, dragCardState, oldArr)
      }

      dragCardState = state
      const arr = getGroupByValues(groupByDocs, state) ?? []
      arr.push(dragCard)
      setGroupByValues(groupByDocs, state, arr)

      groupByDocs = groupByDocs
    }
  }
  function panelDragLeave (event: Event | undefined, state: CategoryType): void {
    event?.preventDefault()
    if (dragCard !== undefined && state !== dragCardInitialState) {
      // We need to restore original position
      const oldArr = getGroupByValues(groupByDocs, state)
      const index = oldArr.findIndex((p) => p._id === dragCard?._id)
      if (index !== -1) {
        oldArr.splice(index, 1)
        setGroupByValues(groupByDocs, state, oldArr)
      }

      if (dragCardInitialPosition !== undefined) {
        const newArr = getGroupByValues(groupByDocs, dragCardInitialState)
        newArr.splice(dragCardInitialPosition, 0, dragCard)
        setGroupByValues(groupByDocs, dragCardInitialPosition, newArr)
      }

      groupByDocs = groupByDocs
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

  function cardDragOver (evt: CardDragEvent, object: Item, state: CategoryType): void {
    if (dragCard !== undefined && !dontUpdateRank) {
      const updates = getUpdateProps(dragCard, state)
      if (updates === undefined) {
        return
      }
      if (object._id !== dragCard._id) {
        let arr = getGroupByValues(groupByDocs, state) ?? []
        const dragCardIndex = arr.findIndex((p) => p._id === dragCard?._id)
        const targetIndex = arr.findIndex((p) => p._id === object._id)
        if (
          dragswap(evt, targetIndex, dragCardIndex) &&
          arr[targetIndex] !== undefined &&
          arr[dragCardIndex] !== undefined
        ) {
          arr.splice(dragCardIndex, 1)
          arr = [...arr.slice(0, targetIndex), dragCard, ...arr.slice(targetIndex)]
          setGroupByValues(groupByDocs, state, arr)
          groupByDocs = groupByDocs
        }
      }
    }
  }
  function cardDrop (evt: CardDragEvent, object: Item, state: CategoryType): void {
    if (!dontUpdateRank && dragCard !== undefined) {
      const arr = getGroupByValues(groupByDocs, state) ?? []
      const s = arr.findIndex((p) => p._id === dragCard?._id)
      if (s !== -1) {
        const newRank = calcRank(arr[s - 1], arr[s + 1])
        dragCard.rank = newRank
      }
    }
    isDragging = false
  }
  function onDragStart (object: Item, state: CategoryType): void {
    dragCardInitialState = state
    dragCardState = state
    dragCardInitialRank = object.rank
    const items = getGroupByValues(groupByDocs, state) ?? []
    dragCardInitialPosition = items.findIndex((p) => p._id === object._id)
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

  $: stateRefs.length = categories.length
  $: stateRows.length = categories.length

  function scrollInto (statePos: number, obj: Item): void {
    stateRefs[statePos]?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    stateRows[statePos]?.scroll(obj)
  }

  function getState (doc: Item): number {
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
    let pos = (of != null ? objects.findIndex((it) => it._id === of._id) : selection) ?? -1
    if (pos === -1) {
      for (const st of categories) {
        const stateObjs = getGroupByValues(groupByDocs, st) ?? []
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

    let objState = getState(obj)
    if (objState === -1) {
      return
    }
    const stateObjs = getGroupByValues(groupByDocs, categories[objState]) ?? []
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
          const nstateObjs = getGroupByValues(groupByDocs, categories[objState]) ?? []
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
        while (objState < categories.length - 1) {
          objState++
          const nstateObjs = getGroupByValues(groupByDocs, categories[objState]) ?? []
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
      // scrollInto(objState, obj)
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

<div class="kanban-container">
  <ScrollBox>
    <div class="kanban-content">
      {#each categories as state, si (typeof state === 'object' ? state.name : state)}
        {@const stateObjects = getGroupByValues(groupByDocs, state)}

        <div
          class="panel-container"
          bind:this={stateRefs[si]}
          on:dragover={(event) => panelDragOver(event, state)}
          on:drop={() => {
            move(state)
            isDragging = false
          }}
        >
          {#if $$slots.header !== undefined}
            <slot name="header" state={toAny(state)} count={stateObjects.length} index={si} />
          {/if}
          <Scroller padding={'.25rem .5rem'} on:dragover on:drop>
            <slot name="beforeCard" {state} />
            <KanbanRow
              bind:this={stateRows[si]}
              on:obj-focus
              index={si}
              {groupByDocs}
              {stateObjects}
              {isDragging}
              {dragCard}
              {objects}
              {selection}
              {checkedSet}
              {state}
              cardDragOver={(evt, obj) => cardDragOver(evt, obj, state)}
              cardDrop={(evt, obj) => cardDrop(evt, obj, state)}
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
    min-width: 0;
    min-height: 0;
  }
  .kanban-content {
    display: flex;
    padding: 1.5rem 1.5rem 0.5rem;
    min-width: 0;
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
  }
</style>
