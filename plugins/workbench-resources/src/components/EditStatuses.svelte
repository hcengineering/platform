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
  import type { Ref, SpaceWithStates, State } from '@anticrm/core'
  import { Dialog } from '@anticrm/ui'
  import { createQuery, getClient } from '@anticrm/presentation'

  import core from '@anticrm/core'

  export let _id: Ref<SpaceWithStates>

  let space: SpaceWithStates | undefined

  let states: State[] = []
  let elements: HTMLElement[] = []

  const client = getClient()

  function sort(states: State[]): State[] {
    if (space === undefined || states.length === 0) { return [] }
    console.log(states)
    const map = states.reduce((map, state) => { map.set(state._id, state); return map }, new Map<Ref<State>, State>())
    console.log(space.states)
    const x = space.states.map(id => map.get(id) as State )
    // console.log(x)
    return x
  }

  const spaceQuery = createQuery()
  $: spaceQuery.query(core.class.SpaceWithStates, { _id }, result => { space = result[0] })

  const query = createQuery()
  $: query.query(core.class.State, { _id: { $in: space?.states ?? [] } }, result => { states = sort(result) })

  let selected: number | undefined
  let dragState: Ref<State>
  let dragStateInitialPosition: number

  function dragswap(ev: MouseEvent, i: number): boolean {
    let s = selected as number
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function dragover(ev: MouseEvent, i: number) {
    let s = selected as number
    if (dragswap(ev, i)) {
      const dragover = states[i]
      const dragging = states[s]
      states[i] = dragging
      states[s] = dragover
      selected = i
    }
  }

  async function move(to: number) {
    client.updateDoc(core.class.SpaceWithStates, core.space.Model, _id, {
      $pull: {
        states: dragState
      }
    })
    client.updateDoc(core.class.SpaceWithStates, core.space.Model, _id, {
      $push: {
        states: {
          $each: [dragState],
          $position: to < dragStateInitialPosition ? to : to
        }
      }
    })
  }
</script>


<Dialog label="Edit Statuses">
  {#each states as state, i}
    {#if state}
    <div bind:this={elements[i]} class="flex-center states" style="background-color: {state.color}; height: 60px" draggable={true}
      on:dragover|preventDefault={(ev) => {
        dragover(ev, i)
      }}
      on:drop|preventDefault={() => {
        console.log('DROP')
        move(i)
      }}
      on:dragstart={() => {
        dragStateInitialPosition = selected = i
        dragState = states[i]._id
      }}
      on:dragend={() => {
        console.log('DRAGEND')
        selected = undefined
      }}
    >
      {state.title}
    </div>
    {/if}
  {/each}
</Dialog>

<style lang="scss">
  .states {
    padding: .25rem .5rem;
    color: #fff;
    border-radius: .5rem;
    user-select: none;
    cursor: grabbing;
  }
</style>
