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
  import { loveUseMaxWidth } from '../stores'

  export let floorContainer: HTMLDivElement
  export let marginInline: string = 'auto'
  export let preview: boolean = false
  export let useResize: boolean = false
  export let rows: number = 5

  const MAX_SIZE_REM = 2 // Maximum cell size in rems
  const MIN_SIZE_REM = 1.5
  const MAX_SIZE_UMW_REM = 4 // Maximum cell size in rems (Use max width)
  const MIN_SIZE_UMW_REM = 2
  const MAX_SIZE_PRE_REM = 2 // Maximum cell size in rems (preview mode)
  const MIN_SIZE_PRE_REM = 0.5
  const FULL_GW = GRID_WIDTH + 2
  $: minWidth = preview
    ? `${FULL_GW * MIN_SIZE_PRE_REM}rem`
    : `${FULL_GW * ($loveUseMaxWidth ? MIN_SIZE_UMW_REM : MIN_SIZE_REM)}rem`
  $: minHeight = preview
    ? `${rows * MIN_SIZE_PRE_REM}rem`
    : `${rows * ($loveUseMaxWidth ? MIN_SIZE_UMW_REM : MIN_SIZE_REM)}rem`
  $: maxWidth = preview
    ? `${FULL_GW * MAX_SIZE_PRE_REM}rem`
    : `${FULL_GW * ($loveUseMaxWidth ? MAX_SIZE_UMW_REM : MAX_SIZE_REM)}rem`
  $: maxHeight = preview
    ? `${rows * MAX_SIZE_PRE_REM}rem`
    : `${rows * ($loveUseMaxWidth ? MAX_SIZE_UMW_REM : MAX_SIZE_REM)}rem`
  $: style = `min-width: ${minWidth}; min-height: ${minHeight}; max-width: ${maxWidth}; max-height: ${maxHeight};`

  const dispatch = createEventDispatcher()
</script>

{#if !useResize}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    bind:this={floorContainer}
    class="floorGrid"
    {style}
    style:grid-template-columns={`repeat(${FULL_GW}, ${preview ? `minmax(${MIN_SIZE_PRE_REM}rem, ${MAX_SIZE_PRE_REM}rem)` : '1fr'})`}
    style:grid-template-rows={rows
      ? `repeat(${rows},  ${preview ? `minmax(${MIN_SIZE_PRE_REM}rem, ${MAX_SIZE_PRE_REM}rem)` : '1fr'})`
      : undefined}
    style:aspect-ratio={`${FULL_GW} / ${rows}`}
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
    {style}
    style:grid-template-columns={`repeat(${FULL_GW}, 1fr)`}
    style:grid-template-rows={rows ? `repeat(${rows}, 1fr)` : undefined}
    style:aspect-ratio={`${FULL_GW} / ${rows}`}
    style:margin-inline={marginInline}
  >
    <slot />
  </div>
{/if}

<style lang="scss">
  .floorGrid {
    position: relative;
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: 1fr;
    place-items: stretch;
    place-content: start center;
    flex-shrink: 0;
    gap: 0;
    width: 100%;
    container: floorGridContainer / inline-size;
  }
</style>
