<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { resizeObserver } from '@hcengineering/ui'
  import { GRID_WIDTH } from '@hcengineering/love'

  export let floorContainer: HTMLDivElement
  export let marginInline: string = 'auto'
  export let preview: boolean = false
  export let rows: number = 5

  const dispatch = createEventDispatcher()
</script>

{#if preview}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    bind:this={floorContainer}
    class="floorGrid"
    style:grid-template-columns={`repeat(${GRID_WIDTH + 2}, 1fr)`}
    style:grid-template-rows={rows ? `repeat(${rows}, 1fr)` : undefined}
    style:max-width={`${(GRID_WIDTH + 2) * 4}rem`}
    style:margin-inline={marginInline}
    on:mouseover
  >
    <slot />
  </div>
{:else}
  <div
    bind:this={floorContainer}
    use:resizeObserver={(element) => {
      dispatch('resize', { width: element.clientWidth, height: element.clientHeight })
    }}
    class="floorGrid"
    style:grid-template-columns={`repeat(${GRID_WIDTH + 2}, 1fr)`}
    style:grid-template-rows={rows ? `repeat(${rows}, 1fr)` : undefined}
    style:max-width={`${(GRID_WIDTH + 2) * 4}rem`}
    style:margin-inline={marginInline}
  >
    <slot />
  </div>
{/if}

<style lang="scss">
  .floorGrid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(17, 1fr);
    grid-auto-flow: row;
    grid-auto-rows: 1fr;
    place-items: stretch;
    place-content: center;
    gap: 0;
    width: 100%;
  }
</style>
