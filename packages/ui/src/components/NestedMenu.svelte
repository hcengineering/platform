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
  import { createEventDispatcher } from 'svelte'
  import { Label, Scroller, Submenu } from '..'
  import { resizeObserver } from '../resize'
  import { DropdownIntlItem } from '../types'
  import NestedMenu from './NestedMenu.svelte'

  export let items: [DropdownIntlItem, DropdownIntlItem[]][]
  export let nestedFrom: DropdownIntlItem | undefined = undefined
  export let onSelect: ((val: DropdownIntlItem) => void) | undefined = undefined

  const elements: HTMLElement[] = []

  const dispatch = createEventDispatcher()

  const actionElements: HTMLButtonElement[] = []

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      actionElements[(index + 1) % actionElements.length]?.focus()
    }

    if (event.key === 'ArrowUp') {
      actionElements[(actionElements.length + index - 1) % actionElements.length]?.focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  function onNestedSelect (val: any): void {
    dispatch('close', val)
  }

  function click (val: DropdownIntlItem): void {
    onSelect?.(val)
    dispatch('close', val)
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    {#if nestedFrom}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        class="menu-item"
        on:keydown={(event) => {
          keyDown(event, -1)
        }}
        on:mouseover={(event) => {
          event.currentTarget.focus()
        }}
        on:click={() => {
          if (nestedFrom !== undefined) {
            click(nestedFrom)
          }
        }}
      >
        <div class="overflow-label pr-1"><Label label={nestedFrom.label} /></div>
      </button>
      <div class="divider" />
    {/if}
    {#each items as item, i}
      {#if item[1].length > 0 && nestedFrom === undefined}
        <Submenu
          bind:element={elements[i]}
          on:keydown={(event) => {
            keyDown(event, i)
          }}
          on:mouseover={() => {
            elements[i]?.focus()
          }}
          label={item[0].label}
          props={{
            items: item[1].map((p) => {
              return [p, []]
            }),
            nestedFrom: item[0],
            onSelect: onNestedSelect
          }}
          options={{ component: NestedMenu }}
        />
      {:else}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item"
          on:keydown={(event) => {
            keyDown(event, i)
          }}
          on:mouseover={(event) => {
            event.currentTarget.focus()
          }}
          on:click={() => {
            click(item[0])
          }}
        >
          <div class="overflow-label pr-1"><Label label={item[0].label} /></div>
        </button>
      {/if}
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>
