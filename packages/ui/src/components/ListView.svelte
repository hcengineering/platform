<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { mouseAttractor, resizeObserver } from '..'
  import ListViewItem from './ListViewItem.svelte'
  import Lazy from './Lazy.svelte'

  export let selection: number = 0
  export let count: number
  export let addClass: string | undefined = undefined
  export let noScroll: boolean = false
  export let kind: 'default' | 'thin' | 'full-size' = 'default'
  export let colorsSchema: 'default' | 'lumia' = 'default'
  export let updateOnMouse = true
  export let lazy = false
  export let highlightIndex: number | undefined = undefined
  const getKey: (index: number) => string = (index) => index.toString()

  const refs: HTMLElement[] = []

  const dispatch = createEventDispatcher()

  let oldSelection = Date.now()

  function onRow (item: number): void {
    if (updateSelection(item)) {
      dispatch('on-select', item)
    }
  }

  function updateSelection (item: number): boolean {
    const now = Date.now()
    if (now - oldSelection >= 25) {
      selection = item
      oldSelection = now
      return true
    }
    return false
  }

  export function select (pos: number): void {
    if (pos < 0) {
      pos = 0
    }
    if (pos >= count) {
      pos = count - 1
    }
    const r = refs[pos]
    onRow(pos)
    if (r !== undefined) {
      r?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }
</script>

{#if count}
  <div
    class="list-container flex-col flex-grow"
    style:overflow={noScroll ? 'visible' : 'auto'}
    use:resizeObserver={() => {
      dispatch('changeContent')
    }}
  >
    {#each Array(count) as _, row (getKey(row))}
      {#if lazy}
        <Lazy>
          <ListViewItem
            bind:element={refs[row]}
            {colorsSchema}
            {addClass}
            {row}
            {kind}
            isHighlighted={row === highlightIndex}
            selected={row === selection}
            on:click={() => dispatch('click', row)}
            on:mouseover={mouseAttractor(() => {
              if (updateOnMouse) {
                onRow(row)
              }
            })}
            on:mouseenter={mouseAttractor(() => {
              if (updateOnMouse) {
                onRow(row)
              }
            })}
          >
            <svelte:fragment slot="category" let:item={itemIndex}>
              <slot name="category" item={itemIndex} />
            </svelte:fragment>
            <svelte:fragment slot="item" let:item={itemIndex}>
              <slot name="item" item={itemIndex} />
            </svelte:fragment>
          </ListViewItem>
        </Lazy>
      {:else}
        <ListViewItem
          bind:element={refs[row]}
          {colorsSchema}
          {addClass}
          {row}
          {kind}
          selected={row === selection}
          isHighlighted={row === highlightIndex}
          on:click={() => dispatch('click', row)}
          on:mouseover={mouseAttractor(() => {
            if (updateOnMouse) {
              onRow(row)
            }
          })}
          on:mouseenter={mouseAttractor(() => {
            if (updateOnMouse) {
              onRow(row)
            }
          })}
        >
          <svelte:fragment slot="category" let:item={itemIndex}>
            <slot name="category" item={itemIndex} />
          </svelte:fragment>
          <svelte:fragment slot="item" let:item={itemIndex}>
            <slot name="item" item={itemIndex} />
          </svelte:fragment>
        </ListViewItem>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  .list-container {
    min-width: 0;
    // border-radius: 0.25rem;
    user-select: none;
  }
</style>
