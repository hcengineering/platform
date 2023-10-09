<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import ui, { Label, Icon, CheckBox } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import { FilterSectionElement } from '../utils'

  export let actions: FilterSectionElement[] = []
  export let onBack: (() => void) | undefined = undefined

  const dispatch = createEventDispatcher()
  const actionElements: HTMLButtonElement[] = []

  $: selectedElementsMap = getSelectedElementsMap(actions)

  const getSelectedElementsMap = (actions: FilterSectionElement[]) => {
    const result: { [k: number]: boolean } = {}

    for (let i = onBack ? 1 : 0; i < actions.length; ++i) {
      result[i] = !!actions[i].isSelected
    }

    return result
  }

  const keyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowDown') {
      actionElements[(index + 1) % actionElements.length].focus()
    }

    if (event.key === 'ArrowUp') {
      actionElements[(actionElements.length + index - 1) % actionElements.length].focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')

      onBack?.()
    }
  }

  onMount(() => {
    if (actionElements[0]) actionElements[0].focus()
  })
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#if actions.length === 0}
        <div class="p-6 error-color">
          <Label label={ui.string.NoActionsDefined} />
        </div>
      {/if}
      {#each actions as action, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          bind:this={actionElements[i]}
          class="ap-menuItem flex-row-center withIcon"
          on:keydown={(event) => keyDown(event, i)}
          on:mouseover={(event) => {
            event.currentTarget.focus()
          }}
          on:click={(event) => {
            if (i === 0 && onBack) {
              dispatch('close')
            }

            action.onSelect(event)

            if (i !== 0 || !onBack) {
              selectedElementsMap[i] = !selectedElementsMap[i]
            }
          }}
        >
          <div class="buttonContent">
            {#if i !== 0 || (i === 0 && !onBack)}
              <div class="flex check pointer-events-none">
                <CheckBox checked={selectedElementsMap[i]} kind={'accented'} />
              </div>
            {/if}
            {#if action.icon}
              <div class="icon" class:ml-3={i > 0 || (i === 0 && !onBack)}>
                <Icon icon={action.icon} size={'small'} />
              </div>
            {/if}
            {#if action.title}
              <div class="ml-3 pr-1">{action.title}</div>
            {/if}
            {#if action.count !== undefined}
              <div class="pr-1 countContent">{action.count}</div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>

<style lang="scss">
  .buttonContent {
    display: flex;
    align-items: center;
  }

  .countContent {
    color: var(--content-color);
  }

  .withIcon {
    margin: 0;

    .icon {
      color: var(--content-color);
    }

    &:focus .icon {
      color: var(--accent-color);
    }
  }
</style>
