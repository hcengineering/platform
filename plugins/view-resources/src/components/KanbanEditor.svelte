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
  import type { Ref, State, Space } from '@anticrm/core'
  import { CircleButton, IconAdd, Label, IconMoreH, showPopup } from '@anticrm/ui'
  import { createQuery, getClient, AttributeEditor } from '@anticrm/presentation'
  import type { BaseKanban } from '@anticrm/view'
  import Circles from './icons/Circles.svelte'
  import ColorsPopup from './ColorsPopup.svelte'
  import StatusesPopup from './StatusesPopup.svelte'

  import core from '@anticrm/core'

  export let kanban: BaseKanban

  let states: State[] = []
  const elements: HTMLElement[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  function sort (order: Ref<State>[], states: State[]): State[] {
    if (states.length === 0) {
      return []
    }

    const map = states.reduce((map, state) => { map.set(state._id, state); return map }, new Map<Ref<State>, State>())
    const x = order
      .map(id => map.get(id))
      .filter((x): x is State => x !== undefined)

    return x
  }

  const statesQ = createQuery()
  $: statesQ.query(core.class.State, { _id: { $in: kanban.states ?? [] } }, result => { states = sort(kanban.states, result) })

  let space: Space | undefined
  const spaceQ = createQuery()
  $: spaceQ.query(core.class.Space, { _id: kanban.space }, (result) => { space = result[0] })

  let selected: number | undefined
  let dragState: Ref<State>

  function dragswap (ev: MouseEvent, i: number): boolean {
    const s = selected as number
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function dragover (ev: MouseEvent, i: number) {
    const s = selected as number
    if (dragswap(ev, i)) {
      [states[i], states[s]] = [states[s], states[i]]
      selected = i
    }
  }

  async function move (to: number) {
    client.updateDoc(kanban._class, kanban.space, kanban._id, {
      $move: {
        states: {
          $value: dragState,
          $position: to
        }
      }
    })
  }

  const onColorChange = (state: State) => async (color: string | undefined): Promise<void> => {
    if (color === undefined) {
      return
    }

    await client.updateDoc(core.class.State, state.space, state._id, { color })
  }

  async function addStatus () {
    const state = await client.createDoc(core.class.State, kanban.space, {
      title: 'New State',
      color: '#7C6FCD'
    })
    await client.updateDoc(kanban._class, kanban.space, kanban._id, {
      $push: {
        states: state
      }
    })
  }
</script>

<div class="flex-col w-full">
  <div class="flex-no-shrink flex-between states-header">
    <Label label={'ACTIVE STATUSES'} />
    <div on:click={addStatus}><CircleButton icon={IconAdd} size={'medium'} /></div>
  </div>
  <div class="content">
    {#each states as state, i}
      {#if state}
        <div bind:this={elements[i]} class="flex-between states" draggable={true}
          on:dragover|preventDefault={(ev) => {
            dragover(ev, i)
          }}
          on:drop|preventDefault={() => {
            move(i)
          }}
          on:dragstart={() => {
            selected = i
            dragState = states[i]._id
          }}
          on:dragend={() => {
            selected = undefined
          }}
        >
          <div class="bar"><Circles /></div>
          <div class="color" style="background-color: {state.color}"
            on:click={() => {
              showPopup(ColorsPopup, {}, elements[i], onColorChange(state))
            }}
          />
          <div class="flex-grow caption-color"><AttributeEditor maxWidth="20rem" _class={core.class.State} object={state} key="title"/></div>
          <div class="tool hover-trans"
            on:click={(ev) => {
              if (space === undefined) {
                return
              }

              showPopup(StatusesPopup, { onDelete: () => dispatch('delete', { kanban, state, space }) }, ev.target, (result) => { if (result) console.log('StatusesPopup:', result) })
            }}
          >
            <IconMoreH size={'medium'} />
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .states {
    padding: .625rem 1rem;
    color: #fff;
    background-color: rgba(67, 67, 72, .3);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
    user-select: none;

    &-header {
      margin-bottom: 1rem;
      font-weight: 600;
      font-size: .75rem;
      color: var(--theme-content-trans-color);
    }

    .bar {
      margin-right: .375rem;
      width: .375rem;
      height: 1rem;
      opacity: .4;
      cursor: grabbing;
    }
    .color {
      margin-right: .75rem;
      width: 1rem;
      height: 1rem;
      border-radius: .25rem;
      cursor: pointer;
    }
    .tool { margin-left: 1rem; }
  }
  .states + .states { margin-top: .5rem; }

  .content {
    overflow-y: auto;
  }
</style>
