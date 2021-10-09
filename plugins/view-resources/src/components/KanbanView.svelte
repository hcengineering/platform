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
  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Doc, Space, SpaceWithStates, FindOptions, State, TxBulkWrite, TxCUD } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { buildModel } from '../utils'
  import { getClient } from '@anticrm/presentation'
  import { Label, showPopup, Loading, ScrollBox, AnyComponent } from '@anticrm/ui'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import type { Kanban } from '@anticrm/view'

  import { createQuery } from '@anticrm/presentation'

  import KanbanPanel from './KanbanPanel.svelte'
  import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'
  import KanbanCardEmpty from './KanbanCardEmpty.svelte'

  import core from '@anticrm/core'
  import view from '@anticrm/view'

  export let _class: Ref<Class<(Doc & { state: Ref<State> })>>
  export let space: Ref<SpaceWithStates>
  export let open: AnyComponent
  export let options: FindOptions<Doc> | undefined
  export let config: string[]

  let _space: SpaceWithStates | undefined
  let kanban: Kanban
  let states: State[] = []
  let objects: (Doc & { state: Ref<State> })[] = []

  const spaceQuery = createQuery()
  $: spaceQuery.query(core.class.SpaceWithStates, { _id: space }, result => { _space = result[0] })

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(view.class.Kanban, { attachedTo: space }, result => { kanban = result[0] })

  function sort(states: State[]): State[] {
    if (_space === undefined || states.length === 0) { return [] }
    const map = states.reduce((map, state) => { map.set(state._id, state); return map }, new Map<Ref<State>, State>())
    return _space.states.map(id => map.get(id) as State )
  }

  function sortObjects<T extends Doc> (objects: T[]): T[] {
    if (_space === undefined || objects.length === 0) { return [] }
    const map = objects.reduce((map, doc) => { map.set(doc._id, doc); return map }, new Map<Ref<Doc>, Doc>())
    const x = kanban.order.map(id => map.get(id) as T)
    return x
  }


  const statesQuery = createQuery()
  $: statesQuery.query(core.class.State, { _id: { $in: _space?.states ?? [] } }, result => { states = sort(result) })

  const query = createQuery()
  $: query.query(_class, { space }, result => { objects = sortObjects(result) }, options)

  function dragover(ev: MouseEvent, object: Doc) {
    if (dragCard !== object) {
      const dragging = objects.indexOf(dragCard)
      const dragover = objects.indexOf(object)
      console.log('dragging', dragging)
      console.log('dragover', dragover)
      objects = objects.filter(x => x !== dragCard)
      objects = [...objects.slice(0, dragover), dragCard, ...objects.slice(dragover)]
      // objects.splice(dragover, 0, [dragCard])
      // objects[dragover] = dragCard
      // objects[dragging] = object
    }
  }

  let currentOp: Promise<void> | undefined

  async function move(to: number, state: Ref<State>) {
    console.log('INITIAL', dragCardInitialPosition, 'TO', to)
    const id = dragCard._id
    const txes: TxCUD<Doc>[] = []

    if (dragCardInitialState !== state) {
      client.updateDoc(_class, space, id, { state })
      // txes.push(client.txFactory.createTxUpdateDoc(_class, space, id, { state }))
    }

    if (dragCardInitialPosition !== to) {

      client.updateDoc(view.class.Kanban, space, kanban._id, {
        $move: {
          order: {
            $value: id,
            $position: to
          }
        }
      })

      // txes.push(client.txFactory.createTxUpdateDoc(view.class.Kanban, space, kanban._id, {
      //   $move: {
      //     order: {
      //       $value: id,
      //       $position: to
      //     }
      //   }
      // }))
      
      // await client.updateDoc(core.class.SpaceWithStates, core.space.Model, space, {
      //   $pull: {
      //     order: id
      //   }
      // })

      // client.updateDoc(core.class.SpaceWithStates, core.space.Model, space, {
      //   $push: {
      //     order: {
      //       $each: [id],
      //       $position: to
      //     }
      //   }
      // })
    }

    // if (txes.length > 0) {
    //   const updateTx = client.txFactory.createTxBulkWrite(space, txes)
    //   if (currentOp) {
    //     await currentOp
    //   }
    //   currentOp = client.tx(updateTx).then(() => console.log('move done')).catch(err => console.log('move error ' + err))
    // }
  }

  function getValue(doc: Doc, key: string): any {
    if (key.length === 0)
      return doc
    const path = key.split('.')
    const len = path.length
    let obj = doc as any
    for (let i=0; i<len; i++){
      obj = obj?.[path[i]]
    }
    return obj
  }

  const client = getClient()

  function onClick(object: Doc) {
    showPopup(open, { object, space }, 'float')
  }

  let dragCard: Doc
  let dragCardInitialPosition: number
  let dragCardInitialState: Ref<State>

  async function cardPresenter(_class: Ref<Class<Doc>>): Promise<AnySvelteComponent> {
    const clazz = client.getHierarchy().getClass(_class) 
    const presenterMixin = client.getHierarchy().as(clazz, view.mixin.KanbanCard)
    return await getResource(presenterMixin.card)
  }

</script>

{#await cardPresenter(_class)}
 <Loading/>
{:then presenter}
<div class="kanban-container">
  <ScrollBox>
    <div class="kanban-content">
      {#each states as state, i}
        <KanbanPanel label={state.title} color={state.color} counter={4}
          on:dragover={(event) => {
            event.preventDefault()
            if (dragCard.state !== state._id) {
              dragCard.state = state._id
            }
          }}>
          <KanbanCardEmpty label={'Create new application'} />
          {#each objects as object, j}
            {#if object.state === state._id}
              {j}
              <div
                on:dragover|preventDefault={(ev) => {
                  dragover(ev, object)
                }}
                on:drop|preventDefault={() => {
                  move(j, state._id)
                }} 
              >
                <svelte:component this={presenter} {object} draggable={true}
                on:dragstart={() => {
                  dragCardInitialState = state._id
                  dragCardInitialPosition = j
                  dragCard = objects[j]
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
{/await}

<style lang="scss">
  .kanban-container {
    margin-bottom: 1.25rem;
    height: 100%;
  }
  .kanban-content {
    display: flex;
    margin: 0 2.5rem;
    height: 100%;
  }
</style>
