<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Method, State, Process } from '@hcengineering/process'
  import { resizeObserver, Scroller, Submenu, Label, SelectPopup, SelectPopupValueType } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import { getClient } from '@hcengineering/presentation'
  import { Doc, Ref } from '@hcengineering/core'
  import { clearSettingsStore, settingsStore } from '@hcengineering/setting-resources'
  import { getToDoEndAction } from '../utils'
  import Aside from './Aside.svelte'
  import ResultConfigure from './contextEditors/ResultConfigure.svelte'

  export let state: State
  export let process: Process

  const client = getClient()

  const elements: HTMLElement[] = []

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      elements[(index + 1) % elements.length].focus()
    }

    if (event.key === 'ArrowUp') {
      elements[(elements.length + index - 1) % elements.length].focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  const transitions: SelectPopupValueType[] = [
    {
      id: plugin.method.CreateToDo,
      label: plugin.string.OnToDoClose,
      icon: plugin.icon.ToDo
    },
    {
      id: plugin.method.WaitSubProcess,
      label: plugin.string.OnSubProcessesDone,
      icon: plugin.icon.WaitSubprocesses
    }
  ]

  async function onTransitionSelect (res: Ref<Method<Doc>>): Promise<void> {
    if (res !== undefined) {
      if (res !== state?.endAction?.methodId) {
        if (res === plugin.method.WaitSubProcess) {
          await client.update(state, {
            endAction: { methodId: plugin.method.WaitSubProcess, params: {} },
            resultType: undefined
          })
          clearSettingsStore()
        } else {
          await client.update(state, { endAction: getToDoEndAction(state) })
        }
      }
      if (res === plugin.method.CreateToDo) {
        $settingsStore = { id: state._id, component: Aside, props: { process, value: state, index: -1 } }
      }
      dispatch('close')
    }
  }

  const dispatch = createEventDispatcher()

  function onResult (): void {
    $settingsStore = { id: state._id + '_result', component: ResultConfigure, props: { state } }
    dispatch('close')
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    <Submenu
      bind:element={elements[0]}
      on:keydown={(event) => {
        keyDown(event, 0)
      }}
      on:mouseover={() => {
        elements[0]?.focus()
      }}
      label={plugin.string.Functions}
      props={{
        value: transitions,
        onSelect: onTransitionSelect
      }}
      options={{ component: SelectPopup }}
      withHover
    />
    {#if state.endAction?.methodId === plugin.method.CreateToDo}
      <div class="menu-separator" />
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        bind:this={elements[1]}
        on:keydown={(event) => {
          keyDown(event, 1)
        }}
        on:mouseover={() => {
          elements[1]?.focus()
        }}
        on:click={onResult}
        class="menu-item"
      >
        <span class="overflow-label pr-1">
          <Label label={state.resultType ? plugin.string.RequestResult : plugin.string.NoResultRequired} />
        </span>
      </button>
    {/if}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
</style>
