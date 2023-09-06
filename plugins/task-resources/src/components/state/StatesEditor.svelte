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
  import { Attribute, Ref, Status } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { DoneState, SpaceWithStates, State } from '@hcengineering/task'
  import {
    CircleButton,
    IconAdd,
    IconCircles,
    IconMoreH,
    Label,
    PaletteColorIndexes,
    defaultBackground,
    eventToHTMLElement,
    getColorNumberByText,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ColorsPopup, StringPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import Lost from '../icons/Lost.svelte'
  import Won from '../icons/Won.svelte'
  import StatusesPopup from './StatusesPopup.svelte'

  export let space: Ref<SpaceWithStates>
  export let ofAttribute: Ref<Attribute<Status>> = task.attribute.State
  export let doneOfAttribute: Ref<Attribute<Status>> = task.attribute.DoneState
  export let states: State[] = []
  export let wonStates: DoneState[] = []
  export let lostStates: DoneState[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  const elements: HTMLElement[] = []
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
      ;[states[i], states[s]] = [states[s], states[i]]
      selected = i
    }
  }

  async function onMove (to: number) {
    dispatch('move', {
      stateID: dragState,
      position: to
    })
  }

  const onColorChange =
    (state: State) =>
      async (color: number | undefined): Promise<void> => {
        if (color == null) {
          return
        }

        await client.updateDoc(state._class, state.space, state._id, { color })
      }
</script>

<div class="flex-no-shrink flex-between trans-title uppercase">
  <Label label={task.string.ActiveStates} />
  <CircleButton
    icon={IconAdd}
    size={'medium'}
    on:click={() => {
      showPopup(
        task.component.CreateStatePopup,
        {
          space,
          ofAttribute,
          _class: task.class.State
        },
        undefined
      )
    }}
  />
</div>
<div class="flex-col flex-no-shrink mt-3">
  {#each states as state, i}
    {@const color = getPlatformColorDef(state.color ?? getColorNumberByText(state.name), $themeStore.dark)}
    {#if state}
      <div
        bind:this={elements[i]}
        class="flex-between states"
        style:background={color.background ?? defaultBackground($themeStore.dark)}
        draggable={true}
        on:dragover|preventDefault={(ev) => {
          dragover(ev, i)
        }}
        on:drop|preventDefault={() => {
          onMove(i)
        }}
        on:dragstart={() => {
          selected = i
          dragState = states[i]._id
        }}
        on:dragend={() => {
          selected = undefined
        }}
      >
        <div class="bar"><IconCircles size={'small'} /></div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="color"
          style:background-color={color.color}
          on:click={() => {
            showPopup(ColorsPopup, { selected: color.name }, elements[i], onColorChange(state))
          }}
        />
        <div class="flex-grow caption-color">
          <StringPresenter value={state.name} oneLine />
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="tool hover-trans"
          on:click={(ev) => {
            showPopup(
              StatusesPopup,
              {
                onDelete: () => dispatch('delete', { state }),
                showDelete: states.length > 1,
                onUpdate: () => {
                  showPopup(task.component.CreateStatePopup, { status: state, space, ofAttribute }, undefined)
                }
              },
              eventToHTMLElement(ev),
              () => {}
            )
          }}
        >
          <IconMoreH size={'medium'} />
        </div>
      </div>
    {/if}
  {/each}
</div>
<div class="flex-col flex-no-shrink mt-9">
  <div class="flex-no-shrink flex-between trans-title uppercase">
    <Label label={task.string.DoneStatesWon} />
    <CircleButton
      icon={IconAdd}
      size={'medium'}
      on:click={() => {
        showPopup(
          task.component.CreateStatePopup,
          {
            space,
            ofAttribute: doneOfAttribute,
            _class: task.class.WonState
          },
          undefined
        )
      }}
    />
  </div>
  <div class="flex-col mt-4">
    {#each wonStates as state}
      {@const color = getPlatformColorDef(PaletteColorIndexes.Crocodile, $themeStore.dark)}
      {#if state}
        <div
          class="states flex-row-center"
          style:color={color.title}
          style:background={color.background ?? defaultBackground($themeStore.dark)}
        >
          <div class="bar" />
          <div class="mr-2">
            <Won size={'medium'} />
          </div>
          <div class="flex-grow caption-color">
            <StringPresenter value={state.name} oneLine />
            <!--            <AttributeEditor maxWidth={'13rem'} _class={state._class} object={state} key="name" />-->
          </div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="tool hover-trans"
            on:click={(ev) => {
              showPopup(
                StatusesPopup,
                {
                  onDelete: () => dispatch('delete', { state }),
                  showDelete: wonStates.length > 1,
                  onUpdate: () => {
                    showPopup(
                      task.component.CreateStatePopup,
                      { status: state, space, ofAttribute: doneOfAttribute },
                      undefined
                    )
                  }
                },
                eventToHTMLElement(ev),
                () => {}
              )
            }}
          >
            <IconMoreH size={'medium'} />
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>
<div class="mt-9 flex-no-shrink">
  <div class="flex-no-shrink flex-between trans-title uppercase">
    <Label label={task.string.DoneStatesLost} />
    <CircleButton
      icon={IconAdd}
      size={'medium'}
      on:click={() => {
        showPopup(
          task.component.CreateStatePopup,
          {
            space,
            ofAttribute: doneOfAttribute,
            _class: task.class.LostState
          },
          undefined
        )
      }}
    />
  </div>
  <div class="mt-4 mb-10">
    {#each lostStates as state}
      {@const color = getPlatformColorDef(PaletteColorIndexes.Firework, $themeStore.dark)}
      {#if state}
        <div
          class="states flex-row-center"
          style:color={color.title}
          style:background={color.background ?? defaultBackground($themeStore.dark)}
        >
          <div class="bar" />
          <div class="mr-2">
            <Lost size={'medium'} />
          </div>
          <div class="flex-grow caption-color">
            <StringPresenter value={state.name} oneLine />
            <!--            <AttributeEditor maxWidth={'13rem'} _class={state._class} object={state} key="name" />-->
          </div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="tool hover-trans"
            on:click={(ev) => {
              showPopup(
                StatusesPopup,
                {
                  onDelete: () => dispatch('delete', { state }),
                  showDelete: lostStates.length > 1,
                  onUpdate: () => {
                    showPopup(
                      task.component.CreateStatePopup,
                      { status: state, space, ofAttribute: doneOfAttribute },
                      undefined
                    )
                  }
                },
                eventToHTMLElement(ev),
                () => {}
              )
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
    padding: 0.5rem 1rem 0.5rem 0.25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    user-select: none;

    .bar {
      margin-right: 0.25rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.4;
      cursor: grabbing;
    }
    .color {
      margin-right: 0.75rem;
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }
    .tool {
      margin-left: 1rem;
    }
  }
  .states + .states {
    margin-top: 0.5rem;
  }
</style>
