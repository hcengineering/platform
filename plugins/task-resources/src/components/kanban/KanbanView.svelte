<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { AttachedDoc, Class, Doc, DocumentUpdate, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State } from '@anticrm/task'
  import task, { DoneState, LostState, WonState, DocWithRank, calcRank } from '@anticrm/task'
  import { AnySvelteComponent, getPlatformColor } from '@anticrm/ui'
  import { AnyComponent, Loading, ScrollBox } from '@anticrm/ui'
  import KanbanPanel from './KanbanPanel.svelte'
  // import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'

  type Item = DocWithRank & { state: Ref<State>, doneState: Ref<DoneState> | null }

  export let _class: Ref<Class<Item>>
  export let space: Ref<SpaceWithStates>
  export let open: AnyComponent
  export let search: string
  export let options: FindOptions<Item> | undefined
  export let config: string[]

  let kanban: Kanban
  let states: State[] = []

  let objects: Item[] = []
  let wonState: WonState | undefined
  let lostState: LostState | undefined

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(task.class.Kanban, { attachedTo: space }, result => { kanban = result[0] })

  const statesQuery = createQuery()
  $: if (kanban !== undefined) {
    statesQuery.query(task.class.State, { space: kanban.space }, result => { states = result }, {
      sort: {
        rank: SortingOrder.Ascending
      }
    })
  }

  const doneStatesQ = createQuery()
  $: if (kanban !== undefined) {
    doneStatesQ.query(
      task.class.DoneState,
      { space: kanban.space, ...search !== '' ? {$search: search} : {} },
      (result) => {
        wonState = result.find((x) => x._class === task.class.WonState)
        lostState = result.find((x) => x._class === task.class.LostState)
      })
  }

  const objsQ = createQuery()
  $: objsQ.query(
    _class,
    {
      space,
      doneState: null,
      ...search !== '' ? {$search: search} : {}
    },
    result => { objects = result },
    {
      ...options,
      sort: {
        rank: SortingOrder.Ascending
      },
    }
  )

  const filteredObjsQ = createQuery()

  // Undefined means no filtering
  let target: Set<Ref<Doc>> | undefined
  $: if (search === '') {
    filteredObjsQ.unsubscribe()
    target = undefined
  } else {
    filteredObjsQ.query(
      _class,
      {
        space,
        doneState: null,
        ...search !== '' ? {$search: search} : {}
      },
      result => { target = new Set(result.map(x => x._id)) },
      options
    )
  }

  function dragover (ev: MouseEvent, object: Item) {
    if (dragCard !== object) {
      const dragover = objects.indexOf(object)
      objects = objects.filter(x => x !== dragCard)
      objects = [...objects.slice(0, dragover), dragCard, ...objects.slice(dragover)]
    }
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

  async function move (state: Ref<State>) {
    let updates: DocumentUpdate<Item> = {}

    if (dragCardInitialState !== state) {
      updates = {
        ...updates,
        state
      }
    }

    if (dragCardInitialPosition !== dragCardEndPosition) {
      const [prev, next] = [objects[dragCardEndPosition - 1], objects[dragCardEndPosition + 1]]

      updates = {
        ...updates,
        rank: calcRank(prev, next)
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateItem(dragCard, updates)
    }
  }

  const client = getClient()

  let dragCard: Item
  let dragCardInitialPosition: number
  let dragCardEndPosition: number
  let dragCardInitialState: Ref<State>

  async function cardPresenter (_class: Ref<Class<Doc>>): Promise<AnySvelteComponent> {
    const clazz = client.getHierarchy().getClass(_class)
    const presenterMixin = client.getHierarchy().as(clazz, task.mixin.KanbanCard)
    return await getResource(presenterMixin.card)
  }

  const onDone = (state: DoneState) => async () => {
    isDragging = false
    hoveredDoneState = undefined
    await updateItem(dragCard, { doneState: state._id })
  }

  let isDragging = false
  let hoveredDoneState: Ref<DoneState> | undefined
</script>

{#await cardPresenter(_class)}
 <Loading/>
{:then presenter}
<div class="flex-col kanban-container">
  <div class="scrollable">
    <ScrollBox>
      <div class="kanban-content">
        {#each states as state (state)}
          <KanbanPanel label={state.title} color={getPlatformColor(state.color)} counter={4}
            on:dragover={(event) => {
              event.preventDefault()
              if (dragCard.state !== state._id) {
                dragCard.state = state._id
              }
            }}
            on:drop={() => {
              move(state._id)
              isDragging = false
            }}>
            <!-- <KanbanCardEmpty label={'Create new application'} /> -->
            {#each objects as object, j (object)}
              {#if object.state === state._id && (target === undefined || target.has(object._id))}
                <div
                  class="step-tb75"
                  on:dragover|preventDefault={(ev) => {
                    dragover(ev, object)
                    dragCardEndPosition = j
                  }}
                  on:drop|preventDefault={() => {
                    dragCardEndPosition = j
                    isDragging = false
                  }} 
                >
                  <svelte:component this={presenter} {object} draggable={true}
                  on:dragstart={() => {
                    dragCardInitialState = state._id
                    dragCardInitialPosition = j
                    dragCardEndPosition = j
                    dragCard = object
                    isDragging = true
                  }}
                  on:dragend={() => {
                    isDragging = false
                  }}/>
                </div>
              {/if}
            {/each}
          </KanbanPanel>
        {/each}
        <!-- <KanbanPanelEmpty label={'Add new column'} /> -->
      </div>
    </ScrollBox>
  </div>
  {#if isDragging && wonState !== undefined && lostState !== undefined}
    <div class="done-panel">
      <div
        class="flex-grow flex-center done-item" 
        class:hovered={hoveredDoneState === wonState._id}
        on:dragenter={() => {
          hoveredDoneState = wonState?._id
        }}
        on:dragleave={() => {
          hoveredDoneState = undefined
        }}
        on:dragover|preventDefault={() => {}}
        on:drop={onDone(wonState)}>
        <div class="done-icon won mr-2"/>
        {wonState.title}
      </div>
      <div
        class="flex-grow flex-center done-item"
        class:hovered={hoveredDoneState === lostState._id}
        on:dragenter={() => {
          hoveredDoneState = lostState?._id
        }}
        on:dragleave={() => {
          hoveredDoneState = undefined
        }}
        on:dragover|preventDefault={() => {}}
        on:drop={onDone(lostState)}>
        <div class="done-icon lost mr-2"/>
        {lostState.title}
      </div>
    </div>
  {/if}
</div>
{/await}

<style lang="scss">
  .kanban-container {
    position: relative;
    height: 100%;
  }
  .kanban-content {
    display: flex;
    margin: 0 2.5rem;
    height: 100%;
  }

  .done-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;

    display: flex;
    align-items: center;
    justify-content: stretch;
    padding: .5rem 2.5rem;
    background-color: var(--theme-bg-color);
    border-top: 1px solid var(--theme-dialog-divider);
  }

  .done-item {
    height: 3rem;
    color: var(--theme-caption-color);
    border: 1px dashed transparent;
    border-radius: .75rem;

    &.hovered {
      background-color: var(--theme-button-bg-enabled);
      border-color: var(--theme-dialog-divider);
    }
  }

  .done-icon {
    width: .5rem;
    height: .5rem;
    border-radius: 50%;

    &.won { background-color: #27B166; }
    &.lost { background-color: #F96E50; }
  }

  .scrollable {
    height: 100%;
    margin-bottom: .25rem;
  }
</style>
