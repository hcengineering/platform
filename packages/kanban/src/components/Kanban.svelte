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
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import { DocWithRank, StateType, TypeState } from '../types'
  import { calcRank } from '../utils'

  type Item = DocWithRank & { state: StateType; doneState: StateType | null }
  type ExtItem = { prev?: Item; it: Item; next?: Item; pos: number }
  type CardDragEvent = DragEvent & { currentTarget: EventTarget & HTMLDivElement }

  export let _class: Ref<Class<Item>>
  export let space: Ref<Space>
  export let search: string
  export let options: FindOptions<Item> | undefined = undefined
  export let states: TypeState[] = []
  export let query: DocumentQuery<Item> = {}
  export let fieldName: string
  export let rankFieldName: string
  export let selection: number | undefined = undefined
  export let checked: Doc[] = []

  const dispatch = createEventDispatcher()

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

  $: dispatch('content', objects)

  function getStateObjects (
    objects: Item[],
    state: TypeState,
    dragItem?: Item // required for svelte to properly recalculate state.
  ): ExtItem[] {
    const stateCards = objects.filter((it) => (it as any)[fieldName] === state._id)
    stateCards.sort((a, b) => (a as any)[rankFieldName]?.localeCompare((b as any)[rankFieldName]))
    return stateCards.map((it, idx, arr) => ({
      it,
      prev: arr[idx - 1],
      next: arr[idx + 1],
      pos: objects.findIndex((pi) => pi._id === it._id)
    }))
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

  $: stateRefs.length = states.length

  function scrollInto (statePos: number): void {
    stateRefs[statePos]?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }

  export function select (offset: 1 | -1 | 0, of?: Doc, dir?: 'vertical' | 'horizontal'): void {
    let pos = (of !== undefined ? objects.findIndex((it) => it._id === of._id) : selection) ?? -1
    if (pos === -1) {
      for (const st of states) {
        const stateObjs = getStateObjects(objects, st)
        if (stateObjs.length > 0) {
          pos = objects.findIndex((it) => it._id === stateObjs[0].it._id)
          console.log('SELECT', '#1', pos)
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
        scrollInto(objState)
        dispatch('obj-focus', (stateObjs[statePos - 1] ?? stateObjs[0]).it)
        return
      } else {
        while (objState > 0) {
          objState--
          const nstateObjs = getStateObjects(objects, states[objState])
          if (nstateObjs.length > 0) {
            scrollInto(objState)
            dispatch('obj-focus', (nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]).it)
            break
          }
        }
      }
    }
    if (offset === 1) {
      if (dir === undefined || dir === 'vertical') {
        scrollInto(objState)
        dispatch('obj-focus', (stateObjs[statePos + 1] ?? stateObjs[stateObjs.length - 1]).it)
        return
      } else {
        while (objState < states.length - 1) {
          objState++
          const nstateObjs = getStateObjects(objects, states[objState])
          if (nstateObjs.length > 0) {
            scrollInto(objState)
            dispatch('obj-focus', (nstateObjs[statePos] ?? nstateObjs[nstateObjs.length - 1]).it)
            break
          }
        }
      }
    }
    if (offset === 0) {
      scrollInto(objState)
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
    dispatch('contextmenu', { evt: evt, objects: checked.length > 0 ? checked : object.it })
  }
</script>

<div class="flex-col kanban-container">
  <div class="scrollable">
    <ScrollBox>
      <div class="kanban-content">
        {#each states as state, si}
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
            <div class="scroll" on:dragover on:drop>
              <ScrollBox vertical>
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
                      class:selection={selection !== undefined ? objects[selection]?._id === object.it._id : false}
                      class:checked={checkedSet.has(object.it._id)}
                      on:mouseover={() => dispatch('obj-focus', object.it)}
                      on:focus={() => {}}
                      on:contextmenu={(evt) => showMenu(evt, object)}
                      draggable={true}
                      class:draggable={true}
                      on:dragstart
                      on:dragend
                      class:dragged
                      on:dragstart={() => onDragStart(object, state)}
                      on:dragend={() => {
                        isDragging = false
                      }}
                    >
                      <slot name="card" object={toAny(object.it)} {dragged} />
                    </div>
                  </div>
                {/each}
                <slot name="afterCard" {space} {state} />
              </ScrollBox>
            </div>
          </div>
        {/each}
        <slot name="afterPanel" />
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
    background-color: var(--body-color);
    border-radius: 0.25rem;
    // transition: box-shadow .15s ease-in-out;

    &.checked {
      background-color: var(--highlight-select);
      box-shadow: inset 0 0 1px 1px var(--highlight-select-border);

      &:hover { background-color: var(--highlight-select-hover); }
    }
    &.selection, &.checked.selection {
      box-shadow: inset 0 0 1px 1px var(--primary-bg-color);
      animation: anim-border 1s ease-in-out;

      &:hover { background-color: var(--highlight-hover); }
    }
    &.checked.selection:hover {
      background-color: var(--highlight-select-hover);
    }

    &.draggable {
      cursor: grab;
    }
    &.dragged {
      background-color: var(--board-bg-color);
    }
  }
  @keyframes anim-border {
    from { box-shadow: inset 0 0 1px 1px var(--primary-edit-border-color); }
    to { box-shadow: inset 0 0 1px 1px var(--primary-bg-color); }
  }

  .panel-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 20rem;
    height: 100%;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;

    .header {
      display: flex;
      flex-direction: column;
      height: 4rem;
      min-height: 4rem;
      user-select: none;

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

    .scroll {
      min-height: 0;
      height: 100%;
    }
  }
</style>
