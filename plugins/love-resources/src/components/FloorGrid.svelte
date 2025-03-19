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
  import { createEventDispatcher, afterUpdate } from 'svelte'
  import { resizeObserver, isSafari, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { GRID_WIDTH } from '@hcengineering/love'

  export let floorContainer: HTMLDivElement
  export let marginInline: string = 'auto'
  export let preview: boolean = false
  export let useResize: boolean = false
  export let rows: number = 5

  const MIN_SIZE_REM = 1 // Minimum cell size in rems
  const MAX_SIZE_REM_UMW = 4 // Maximum cell size in rems (Use max width)
  const MIN_SIZE_REM_UMW = 2 // Minimum cell size in rems (Use max width)
  const MAX_SIZE_REM_PRE = 2 // Maximum cell size in rems (preview mode)
  const FULL_GW = GRID_WIDTH + 2

  let wrapperWidth: number, wrapperHeight: number
  let oldRows: number
  let overflow: boolean[] = [false, false]

  const mode: 'resize' | 'fit' | 'width' = useResize
    ? 'resize'
    : preview || isSafari() || $deviceInfo.isMobile
      ? 'width'
      : 'fit'
  const useMaxWidth = mode === 'resize' || (mode === 'width' && !preview)

  const minW = FULL_GW * MIN_SIZE_REM * $deviceInfo.fontSize
  $: minH = rows * MIN_SIZE_REM * $deviceInfo.fontSize

  let minWidth = useMaxWidth ? `${FULL_GW * MIN_SIZE_REM_UMW}rem` : `${FULL_GW * MIN_SIZE_REM}rem`
  $: minHeight = useMaxWidth ? `${rows * MIN_SIZE_REM_UMW}rem` : `${rows * MIN_SIZE_REM}rem`

  let maxWidth = useMaxWidth
    ? `${FULL_GW * MAX_SIZE_REM_UMW}rem`
    : preview
      ? `${FULL_GW * MAX_SIZE_REM_PRE}rem`
      : '100%'
  $: maxHeight = useMaxWidth ? `${rows * MAX_SIZE_REM_UMW}rem` : preview ? `${rows * MAX_SIZE_REM_PRE}rem` : '100%'

  $: style = `min-width: ${minWidth}; min-height: ${minHeight}; max-width: ${maxWidth}; max-height: ${maxHeight};`

  const dispatch = createEventDispatcher()

  const checkGrid = (): void => {
    overflow = [wrapperWidth < minW, wrapperHeight < minH]
    const minK = Math.min(
      (overflow[0] ? minW : wrapperWidth) / FULL_GW,
      (overflow[1] ? minH : wrapperHeight - 16) / rows
    )
    minWidth = maxWidth = `${(FULL_GW * minK) / $deviceInfo.fontSize}rem`
    minHeight = maxHeight = `${(rows * minK) / $deviceInfo.fontSize}rem`
    oldRows = rows
  }
  afterUpdate(() => {
    if (rows !== oldRows && mode === 'fit') checkGrid()
  })
</script>

{#if mode === 'fit'}
  <div
    class="floorGrid-wrapper"
    style:overflow-x={overflow[0] ? 'scroll' : 'hidden'}
    style:overflow-y={overflow[1] ? 'scroll' : 'hidden'}
    use:resizeObserver={(element) => {
      wrapperWidth = element.clientWidth
      wrapperHeight = element.clientHeight
      checkGrid()
    }}
  >
    <div
      bind:this={floorContainer}
      class="floorGrid"
      {style}
      style:grid-template-columns={`repeat(${FULL_GW}, 1fr)`}
      style:grid-template-rows={`repeat(${rows},  1fr)`}
      style:aspect-ratio={`${FULL_GW} / ${rows}`}
      style:margin-inline={marginInline}
    >
      <slot />
    </div>
  </div>
{:else if mode === 'width'}
  {@const minSize = preview ? MIN_SIZE_REM : MIN_SIZE_REM_UMW}
  {@const maxSize = preview ? MAX_SIZE_REM_PRE : MAX_SIZE_REM_UMW}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    bind:this={floorContainer}
    class="floorGrid full"
    {style}
    style:grid-template-columns={`repeat(${FULL_GW}, minmax(${minSize}rem, ${maxSize}rem))`}
    style:grid-template-rows={`repeat(${rows},  minmax(${minSize}rem, ${maxSize}rem)`}
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
    class="floorGrid w-full"
    {style}
    style:grid-template-columns={`repeat(${FULL_GW}, minmax(${MIN_SIZE_REM_UMW}rem, ${MAX_SIZE_REM_UMW}rem))`}
    style:grid-template-rows={`repeat(${rows}, minmax(${MIN_SIZE_REM_UMW}rem, ${MAX_SIZE_REM_UMW}rem))`}
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
    flex-shrink: 0;
    gap: 0;
    container: floorGridContainer / inline-size;

    &.full {
      width: 100%;
      width: -moz-available;
    }
  }
  .floorGrid-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-grow: 1;
    width: 100%;
    height: 100%;

    .floorGrid {
      width: 100%;
      height: 100%;
    }
  }
</style>
