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
  import { onDestroy, onMount } from 'svelte'

  export let size: 'small' | 'big' = 'big'

  let barContainer: HTMLDivElement | undefined
  let rowContainer: HTMLDivElement | undefined
  let scale = 1

  let resizeObserver: ResizeObserver | undefined
  const HORIZONTAL_PADDING = 60
  const SCALE_CHANGE_THRESHOLD = 0.001

  function measureWidths (): { barWidth: number, rowWidth: number } {
    if (barContainer === undefined || rowContainer === undefined) {
      return { barWidth: 0, rowWidth: 0 }
    }

    const availableWidth = barContainer.clientWidth - HORIZONTAL_PADDING
    const barWidth = availableWidth > 0 ? availableWidth : 0
    const rowWidth = rowContainer.scrollWidth

    return { barWidth, rowWidth }
  }

  function updateScale (): void {
    const { barWidth: containerWidth, rowWidth } = measureWidths()

    if (containerWidth === 0 || rowWidth === 0) {
      if (scale !== 1) scale = 1
      return
    }

    const nextScale = Math.min(1, containerWidth / rowWidth)

    if (Math.abs(nextScale - scale) > SCALE_CHANGE_THRESHOLD) {
      scale = Number(nextScale.toFixed(3))
    }
  }

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      updateScale()
    })
    if (barContainer !== undefined) resizeObserver.observe(barContainer)
    if (rowContainer !== undefined) resizeObserver.observe(rowContainer)
    updateScale()
  })

  onDestroy(() => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
  })
</script>

<div class="bar" data-size={size} bind:this={barContainer}>
  <div class="row" bind:this={rowContainer} style={`--row-scale:${scale};`}>
    <div class="left"><slot name="left" /></div>
    <div class="center"><slot name="center" /></div>
    <div class="right"><slot name="right" /></div>
    <slot name="extra" />
  </div>
</div>

<style lang="scss">
  .bar {
    --g: 0.5rem;
  }

  .bar {
    padding: 1rem;
    border-top: 1px solid var(--theme-divider-color);
    container-type: inline-size;
    width: 100%;
  }

  .row {
    --row-scale: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--g);
    transform-origin: center center;
    transform: scale(var(--row-scale));
    will-change: transform;
  }
  .left,
  .center,
  .right {
    display: flex;
    align-items: center;
    gap: var(--g);
    white-space: nowrap;
    min-width: 0;
    flex-shrink: 0;
  }
  .center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  @container (max-width: 440px) {
    .bar[data-size='small'] .row {
      justify-content: center;
      gap: var(--g);
    }
    .bar[data-size='small'] .left,
    .bar[data-size='small'] .center,
    .bar[data-size='small'] .right {
      display: contents;
    }
    .bar[data-size='small'] .center {
      position: static;
      transform: none;
    }
  }

  @container (max-width: 960px) {
    .bar[data-size='big'] .row {
      justify-content: center;
      gap: var(--g);
    }
    .bar[data-size='big'] .left,
    .bar[data-size='big'] .center,
    .bar[data-size='big'] .right {
      display: contents;
    }
    .bar[data-size='big'] .center {
      position: static;
      transform: none;
    }
  }
</style>
