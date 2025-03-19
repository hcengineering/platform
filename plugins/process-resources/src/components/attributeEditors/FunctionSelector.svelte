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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ProcessFunction } from '@hcengineering/process'
  import { resizeObserver, Scroller, Label } from '@hcengineering/ui'
  import process from '../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let availableFunctions: Ref<ProcessFunction>[]
  export let onSelect: (e: Ref<ProcessFunction>) => void

  const elements: HTMLButtonElement[] = []

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

  const dispatch = createEventDispatcher()

  const client = getClient()

  $: funcs = client.getModel().findAllSync(process.class.ProcessFunction, { _id: { $in: availableFunctions } })
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#each funcs as f, i}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        class="menu-item"
        on:keydown={(event) => {
          keyDown(event, i)
        }}
        on:mouseover={() => {
          elements[i]?.focus()
        }}
        on:click={() => {
          onSelect(f._id)
        }}
      >
        <span class="overflow-label pr-1"><Label label={f.label} /></span>
      </button>
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>
