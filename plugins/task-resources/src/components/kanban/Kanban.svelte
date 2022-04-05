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
  import core, {
    AttachedDoc,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    FindOptions, Ref, Space
  } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import task, { calcRank, DocWithRank } from '@anticrm/task'
  import { AnySvelteComponent, getPlatformColor, Loading, ScrollBox } from '@anticrm/ui'
  import { slide } from 'svelte/transition'
  import KanbanPanel from './KanbanPanel.svelte'

  type StateType = any
  type Item = DocWithRank & { state: StateType; doneState: StateType | null }

  export let _class: Ref<Class<Item>>
  export let space: Ref<Space>
  // export let open: AnyComponent
  export let search: string
  export let options: FindOptions<Item> | undefined
  // export let config: string[]

  type TypeState = { _id: StateType; title: string; color: number }

  export let states: TypeState[] = []

  export let stateQuery: DocumentQuery<Item> = {
    /// doneState: null
  }

  let objects: Item[] = []

  const objsQ = createQuery()
  $: objsQ.query(
    _class,
    {
      space,
      ...stateQuery,
      ...(search !== '' ? { $search: search } : {})
    },
    (result) => {
      objects = result
    },
    {
      ...options
    }
  )

  function getStateObjects (objects: Item[], state: TypeState, dragItem?: Item): {it:Item, prev?:Item, next?: Item}[] {
    const stateCards = objects.filter(it => it.state === state._id)
    stateCards.sort((a, b) => a.rank.localeCompare(b.rank))
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
        state
      }
    }
  
    if (dragCardInitialRank !== dragCard.rank) {
      updates = {
        ...updates,
        rank: dragCard.rank
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

  async function cardPresenter (_class: Ref<Class<Doc>>): Promise<AnySvelteComponent> {
    const clazz = client.getHierarchy().getClass(_class)
    const presenterMixin = client.getHierarchy().as(clazz, task.mixin.KanbanCard)
    return await getResource(presenterMixin.card)
  }

  let isDragging = false

  async function updateDone (query: DocumentUpdate<Item>): Promise<void> {
    isDragging = false
    if (dragCard === undefined) {
      return
    }
    await updateItem(dragCard, query)
  }
  function doCalcRank (object: {prev?: Item, it: Item, next?: Item}, event: DragEvent & { currentTarget: EventTarget & HTMLDivElement}): string {
    const rect = event.currentTarget.getBoundingClientRect()

    if (event.clientY < rect.top + rect.height * 2 / 3) {
      return calcRank(object.prev, object.it)
    } else {
      return calcRank(object.it, object.next)
    }
  }
  const slideD = (node: any, args:any) => args.isDragging ? slide(node, args) : {}
</script>

{#await cardPresenter(_class)}
  <Loading />
{:then presenter}
  <div class="flex-col kanban-container">
    <div class="scrollable">
      <ScrollBox>
        <div class="kanban-content">
          {#each states as state}
            <KanbanPanel
              label={state.title}
              color={getPlatformColor(state.color)}
              on:dragover={(event) => {
                event.preventDefault()
                if (dragCard !== undefined && dragCard.state !== state._id) {
                  dragCard.state = state._id
                  const objs = getStateObjects(objects, state)
                  dragCard.rank = calcRank(objs[objs.length - 1]?.it, undefined)
                }
              }}
              on:drop={() => {
                move(state._id)
                isDragging = false
              }}
            >
              <!-- <KanbanCardEmpty label={'Create new application'} /> -->
              {#each getStateObjects(objects, state, dragCard) as object}
                  <div transition:slideD={{ isDragging }}
                    class="step-tb75"
                    on:dragover|preventDefault={(evt) => {
                      if (dragCard !== undefined) {
                        dragCard.rank = doCalcRank(object, evt)
                      }
                    }}
                    on:drop|preventDefault={(evt) => {
                      if (dragCard !== undefined) {
                        dragCard.rank = doCalcRank(object, evt)
                      }
                      isDragging = false
                    }}
                  >
                    <svelte:component
                      this={presenter}
                      object={object.it}
                      dragged={isDragging && object.it._id === dragCard?._id}
                      draggable={true}
                      on:dragstart={() => {
                        dragCardInitialState = state._id
                        dragCardInitialRank = object.it.rank
                        dragCard = object.it
                        isDragging = true
                      }}
                      on:dragend={() => {
                        isDragging = false
                      }}
                    />
                  </div>
              {/each}
            </KanbanPanel>
          {/each}
          <!-- <KanbanPanelEmpty label={'Add new column'} /> -->
        </div>
      </ScrollBox>
    </div>
    {#if isDragging}
      <slot name="doneBar" onDone={updateDone} />
    {/if}
  </div>
{/await}

<style lang="scss">
  .kanban-container {
    position: relative;
    height: 100%;
    background: var(--board-bg-color);
  }
  .kanban-content {
    display: flex;
    margin: 1.5rem 2rem;
    height: 100%;
  }

  .scrollable {
    height: 100%;
  }
</style>
