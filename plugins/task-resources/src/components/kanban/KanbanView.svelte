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
  import type { AttachedDoc, Class, Doc, FindOptions, Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Kanban, SpaceWithStates, State, Task } from '@anticrm/task'
  import task, { DoneState, LostState, WonState } from '@anticrm/task'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { AnyComponent, Loading, ScrollBox } from '@anticrm/ui'
  import KanbanPanel from './KanbanPanel.svelte'
  import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'

  type Item = Doc & { state: Ref<State>, doneState: Ref<DoneState> | null }

  export let _class: Ref<Class<Item>>
  export let space: Ref<SpaceWithStates>
  export let open: AnyComponent
  export let options: FindOptions<Item> | undefined
  export let config: string[]

  let kanban: Kanban
  let states: State[] = []
  let rawStates: State[] = []

  let objects: (Item | undefined)[] = []
  let rawObjects: Item[] = []
  let kanbanStates: Ref<State>[] = []
  let kanbanDoneStates: Ref<DoneState>[] = []
  let wonState: WonState | undefined
  let lostState: LostState | undefined

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(task.class.Kanban, { attachedTo: space }, result => { kanban = result[0] })

  $: kanbanStates = kanban?.states ?? []
  $: kanbanDoneStates = kanban?.doneStates ?? []

  function sort (kanban: Kanban, states: State[]): State[] {
    if (kanban === undefined || states.length === 0) { return [] }
    const map = states.reduce((map, state) => { map.set(state._id, state); return map }, new Map<Ref<State>, State>())
    return kanban.states.map(id => map.get(id) as State)
  }

  function sortObjects<T extends Doc> (kanban: Kanban, objects: T[]): (T | undefined)[] {
    if (kanban === undefined || objects.length === 0) { return [] }
    const map = objects.reduce((map, doc) => { map.set(doc._id, doc); return map }, new Map<Ref<T>, T>())
    return kanban.order
      .map(id => map.get(id as Ref<T>))
  }

  const statesQuery = createQuery()
  $: if (kanbanStates.length > 0) statesQuery.query(task.class.State, { _id: { $in: kanbanStates } }, result => { rawStates = result })
  $: states = sort(kanban, rawStates)

  const doneStatesQ = createQuery()
  $: if (kanbanDoneStates.length > 0) {
    doneStatesQ.query(task.class.DoneState, { _id: { $in: kanbanDoneStates } }, (result) => {
      wonState = result.find((x) => x._class === task.class.WonState)
      lostState = result.find((x) => x._class === task.class.LostState)
    })
  }

  const query = createQuery()
  $: query.query(_class, { space, doneState: null }, result => { rawObjects = result }, options)

  $: objects = sortObjects(kanban, rawObjects)

  function dragover (ev: MouseEvent, object: Item) {
    if (dragCard !== object) {
      const dragover = objects.indexOf(object)
      objects = objects.filter(x => x !== dragCard)
      objects = [...objects.slice(0, dragover), dragCard, ...objects.slice(dragover)]
    }
  }

  async function move (state: Ref<State>) {
    const id = dragCard._id

    if (dragCardInitialState !== state) {
      if (client.getHierarchy().isDerived(_class, core.class.AttachedDoc)) {
        const adoc: AttachedDoc = dragCard as Doc as AttachedDoc
        // We need to update using updateCollection
        client.updateCollection(_class, space, id as Ref<Doc> as Ref<AttachedDoc>, adoc.attachedTo, adoc.attachedToClass, adoc.collection, { state })
      } else {
        client.updateDoc<Task>(_class, space, id as Ref<Task>, { state })
      }
    }

    if (dragCardInitialPosition !== dragCardEndPosition) {
      client.updateDoc(task.class.Kanban, space, kanban._id, {
        $move: {
          order: {
            $value: id,
            $position: dragCardEndPosition
          }
        }
      })
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
    if (client.getHierarchy().isDerived(_class, core.class.AttachedDoc)) {
      const adoc: AttachedDoc = dragCard as Doc as AttachedDoc
      await client.updateCollection<Doc, Task>(
        _class,
        space,
        adoc._id as Ref<Task>,
        adoc.attachedTo,
        adoc.attachedToClass,
        adoc.collection,
        { doneState: state._id }
      )
    } else {
      await client.updateDoc(dragCard._class, dragCard.space, dragCard._id, {
        doneState: state._id
      })
    }

    isDragging = false
    hoveredDoneState = undefined
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
          <KanbanPanel label={state.title} color={state.color} counter={4}
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
              {#if object !== undefined && object.state === state._id}
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
        <KanbanPanelEmpty label={'Add new column'} />
      </div>
    </ScrollBox>
  </div>
  {#if isDragging && wonState !== undefined && lostState !== undefined}
    <div class="done-panel">
      <div
        class="done-item flex-center w-full" 
        class:hovered={hoveredDoneState === wonState._id}
        on:dragenter={() => {
          hoveredDoneState = wonState?._id
        }}
        on:dragleave={() => {
          hoveredDoneState = undefined
        }}
        on:dragover|preventDefault={() => {}}
        on:drop={onDone(wonState)}>
        <div class="done-icon won"/>
        {wonState.title}
      </div>
      <div
        class="done-item flex-center w-full"
        class:hovered={hoveredDoneState === lostState._id}
        on:dragenter={() => {
          console.log('enter')
          hoveredDoneState = lostState?._id
        }}
        on:dragleave={() => {
          console.log('leave')
          hoveredDoneState = undefined
        }}
        on:dragover|preventDefault={() => {}}
        on:drop={onDone(lostState)}>
        <div class="done-icon lost"/>
        {lostState.title}
      </div>
    </div>
  {/if}
</div>
{/await}

<style lang="scss">
  .kanban-container {
    height: 100%;
  }
  .kanban-content {
    display: flex;
    margin: 0 2.5rem;
    height: 100%;
  }

  .done-panel {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    height: 4rem;
    border-top: 1px solid var(--theme-bg-accent-hover);
  }

  .done-item {
    gap: 0.5rem;
    color: var(--theme-content-accent-color);

    margin: 0.5rem 2.5rem;

    &.hovered {
      background-color: var(--theme-bg-selection);
      border-radius: 12px;
      border: 1px dashed var(--theme-bg-accent-hover);
    }
  }

  .done-icon {
    width: 0.5rem;
    height: 0.5rem;

    border-radius: 50%;

    &.won {
      background-color: #a5d179;
    }

    &.lost {
      background-color: #f28469;
    }
  }
  .scrollable {
    height: 100%;
    margin-bottom: 0.25rem;
  }
</style>
