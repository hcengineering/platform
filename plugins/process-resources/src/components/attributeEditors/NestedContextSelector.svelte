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
  import { AnyAttribute } from '@hcengineering/core'
  import { Label, resizeObserver, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { SelectedContext, NestedContext } from '@hcengineering/process'
  import { getValueReduceFunc } from '../../utils'

  export let context: NestedContext
  export let target: AnyAttribute
  export let onSelect: (val: SelectedContext) => void

  const dispatch = createEventDispatcher()

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

  function onAttribute (attr: AnyAttribute): void {
    const pathReduce = getValueReduceFunc(context.attribute, target)
    const valueFunc = getValueReduceFunc(attr, target)
    onSelect({
      type: 'nested',
      key: attr.name,
      path: context.attribute.name,
      functions: valueFunc !== undefined ? [valueFunc] : [],
      sourceFunction: pathReduce
    })
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#each context.attributes as attr, i}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        bind:this={elements[i]}
        on:keydown={(event) => {
          keyDown(event, i)
        }}
        on:mouseover={() => {
          elements[i]?.focus()
        }}
        on:click={() => {
          onAttribute(attr)
        }}
        class="menu-item"
      >
        <span class="overflow-label pr-1">
          <Label label={attr.label} />
        </span>
      </button>
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>
