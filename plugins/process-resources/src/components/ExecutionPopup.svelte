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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getAttrTypePresenter } from '@hcengineering/view-resources'
  import { Execution, State } from '@hcengineering/process'
  import { AnyComponent, AnySvelteComponent, Component, Icon, resizeObserver, Scroller } from '@hcengineering/ui'
  import IconBacklog from './icons/IconBacklog.svelte'
  import IconCompleted from './icons/IconCompleted.svelte'
  import IconProgress from './icons/IconProgress.svelte'
  import { createEventDispatcher } from 'svelte'

  export let value: WithLookup<Execution>

  const client = getClient()
  const h = client.getHierarchy()
  $: states = value?.$lookup?.process?.states ?? client.getModel().findObject(value.process)?.states ?? []

  interface StateData {
    state: Ref<State>
    text: string
    icon: AnySvelteComponent
    iconProps: Record<string, any>
    result: any | undefined
    resultPresenter: AnyComponent | undefined
  }

  function getResultPresenter (state: State): AnyComponent | undefined {
    if (state.resultType != null) {
      return getAttrTypePresenter(h, state.resultType)
    }
  }

  function getValues (value: WithLookup<Execution>, states: Ref<State>[]): StateData[] {
    const res: StateData[] = []
    let isDone = true
    for (let i = 0; i < states.length; i++) {
      const state = states[i]
      const stateObj = client.getModel().findObject(state)
      if (stateObj === undefined) {
        continue
      }
      const isCurrent = value.currentState === state && i !== states.length - 1
      if (isCurrent || value.currentState == null) {
        isDone = false
      }
      const result = value.results?.[state]
      const resultPresenter = getResultPresenter(stateObj)
      res.push({
        state,
        text: stateObj.title,
        icon: isCurrent ? IconProgress : isDone ? IconCompleted : IconBacklog,
        iconProps: {
          fill: isCurrent ? 11 : isDone ? 17 : 21,
          count: states.length,
          index: i + 1
        },
        result,
        resultPresenter
      })
    }
    return res
  }

  const dispatch = createEventDispatcher()

  $: values = getValues(value, states)
</script>

<div
  class="selectPopup max-width-40 clear-mins"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div class="menu-space" />
  <Scroller>
    {#each values as state}
      <div class="menu-item default-cursor flex-gap-2">
        <div class="overflow-label flex flex-gap-2">
          <Icon icon={state.icon} iconProps={state.iconProps} size={'small'} />
          {state.text}
        </div>
        <div>
          {#if state.result !== undefined && state.resultPresenter !== undefined}
            <Component is={state.resultPresenter} props={{ value: state.result }} />
          {/if}
        </div>
      </div>
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .menu-item {
    display: flex;
    cursor: default;
    align-items: center;
    justify-content: space-between;
  }
</style>
