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
  import { getClient } from '@hcengineering/presentation'
  import { RelatedContext, SelectedContext } from '@hcengineering/process'
  import { Label, resizeObserver, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getRelationReduceFunc, getValueReduceFunc } from '../../utils'

  export let context: RelatedContext
  export let target: AnyAttribute
  export let onSelect: (val: SelectedContext) => void

  const client = getClient()

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
    const reduceFunc = getRelationReduceFunc(client, context.association, context.direction)
    const valueFunc = getValueReduceFunc(attr, target)
    onSelect({
      type: 'relation',
      key: attr.name,
      association: context.association,
      direction: context.direction,
      name: context.name,
      functions: valueFunc !== undefined ? [valueFunc] : [],
      sourceFunction: reduceFunc
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
