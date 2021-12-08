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
  import type { Ref, SpaceWithStates, State, Class, Obj } from '@anticrm/core'
  import { CircleButton, IconAdd, Label, IconMoreH, showPopup } from '@anticrm/ui'
  import { createQuery, getClient, AttributeEditor } from '@anticrm/presentation'
  import type { Kanban } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import Close from './icons/Close.svelte'
  import Circles from './icons/Circles.svelte'
  import Status from './icons/Status.svelte'
  import ColorsPopup from './ColorsPopup.svelte'
  import StatusesPopup from './StatusesPopup.svelte'

  import core from '@anticrm/core'
  import view from '@anticrm/view'

  export let _id: Ref<SpaceWithStates>
  export let spaceClass: Ref<Class<Obj>>

  let kanban: Kanban | undefined

  let states: State[] = []
  const elements: HTMLElement[] = []
  let spaceClassInstance: Class<SpaceWithStates> | undefined
  let spaceInstance: SpaceWithStates | undefined

  const client = getClient()

  function sort (states: State[]): State[] {
    if (kanban === undefined || states.length === 0) { return [] }
    console.log(states)
    const map = states.reduce((map, state) => { map.set(state._id, state); return map }, new Map<Ref<State>, State>())
    console.log(kanban.states)
    const x = kanban.states.map(id => map.get(id) as State)
    return x
  }

  const kanbanQuery = createQuery()
  $: kanbanQuery.query(view.class.Kanban, { attachedTo: _id }, result => { kanban = result[0] })

  const query = createQuery()
  $: query.query(core.class.State, { _id: { $in: kanban?.states ?? [] } }, result => { states = sort(result) })

  const spaceQ = createQuery()
  $: spaceQ.query<Class<SpaceWithStates>>(core.class.Class, { _id: spaceClass }, result => { spaceClassInstance = result.shift() })

  const spaceI = createQuery()
  $: spaceI.query<SpaceWithStates>(spaceClass, { _id: _id }, result => { spaceInstance = result.shift() })

  let selected: number | undefined
  let dragState: Ref<State>
  let dragStateInitialPosition: number

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
      const dragover = states[i]
      const dragging = states[s]
      states[i] = dragging
      states[s] = dragover
      selected = i
    }
  }

  async function move (to: number) {
    client.updateDoc(view.class.Kanban, _id, (kanban as Kanban)._id, {
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

  const dispatch = createEventDispatcher()

  async function addStatus () {
    const state = await client.createDoc(core.class.State, _id, {
      title: 'New State',
      color: '#7C6FCD'
    })
    await client.updateDoc(view.class.Kanban, _id, (kanban as Kanban)._id, {
      $push: {
        states: state
      }
    })
  }
</script>

<div class="flex-col floatdialog-container">
  <div class="flex-between header">
    <div class="flex-grow flex-col">
      <div class="flex-row-center">
        <div class="icon"><Status size={'small'} /></div>
        <span class="overflow-label title">Manage application statuses within <Label label={spaceClassInstance?.label}/></span>
      </div>
      <div class="overflow-label subtitle">{spaceInstance?.name}</div>
    </div>
    <div class="tool" on:click={() => dispatch('close')}><Close size={'small'} /></div>
  </div>
  <div class="flex-grow flex-col content">
    <div class="flex-no-shrink flex-between states-header">
      <Label label={'ACTIVE STATUSES'} />
      <div on:click={addStatus}><CircleButton icon={IconAdd} size={'medium'} /></div>
    </div>
    <div class="vScroll"><div class="h-full">
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
              dragStateInitialPosition = selected = i
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
                showPopup(StatusesPopup, { kanban, state, spaceClass }, ev.target, (result) => { if (result) console.log('StatusesPopup:', result) })
              }}
            >
              <IconMoreH size={'medium'} />
            </div>
          </div>
        {/if}
      {/each}
    </div></div>
  </div>
</div>

<style lang="scss">
  .floatdialog-container {
    margin: 2rem 1rem 1.25rem 0;
    height: calc(100% - 3.25rem);
    background: var(--theme-dialog-bg-spec);
    border-radius: 1.25rem;
    box-shadow: var(--theme-dialog-shadow);
    backdrop-filter: blur(15px);

    .header {
      padding: 0 2rem 0 2.5rem;
      height: 4.5rem;
      min-height: 4.5rem;

      .icon {
        margin-right: .5rem;
        opacity: .6;
      }
      .title {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
      .subtitle {
        font-size: .75rem;
        color: var(--theme-content-dark-color);
      }
      .tool {
        margin-left: 2.5rem;
        cursor: pointer;
      }
    }
    .content { margin: 1rem 2.5rem 1rem 2.5rem; }
  }

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
</style>
