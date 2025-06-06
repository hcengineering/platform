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
  import { resizeObserver } from '@hcengineering/ui'
  import { afterUpdate } from 'svelte'

  export let noLabel: boolean = false

  let grow: HTMLElement
  let leftPanel: HTMLElement
  let leftPanelSize: number = 0

  let combinePanel: boolean = false

  const checkBar = (): void => {
    if (grow === undefined || leftPanel === undefined) return
    if (!noLabel && leftPanel.clientWidth > leftPanelSize) leftPanelSize = leftPanel.clientWidth
    if (grow.clientWidth - 16 < leftPanel.clientWidth && !noLabel && !combinePanel) noLabel = true
    else if (grow.clientWidth - 16 < leftPanel.clientWidth && noLabel && !combinePanel) combinePanel = true
    else if (grow.clientWidth * 2 - 32 > leftPanel.clientWidth && noLabel && combinePanel) combinePanel = false
    else if (grow.clientWidth - 32 >= leftPanelSize && noLabel && !combinePanel) noLabel = false
  }
  afterUpdate(() => {
    checkBar()
  })
</script>

<div class="bar w-full flex-center flex-gap-2 flex-no-shrink" class:combinePanel use:resizeObserver={checkBar}>
  <div class="bar__right-panel flex-gap-2 flex-center">
    <slot name="right" />
  </div>
  <div bind:this={grow} class="flex-grow" />
  <slot name="center" />
  <div bind:this={leftPanel} class="bar__left-panel flex-gap-2 flex-center">
    <slot name="left" />
  </div>
  <div class="flex-grow" />
  <slot name="extra" />
</div>

<style lang="scss">
  .bar {
    overflow-x: auto;
    position: relative;
    padding: 1rem;
    border-top: 1px solid var(--theme-divider-color);

    &__left-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 1rem;
      height: 100%;
    }

    &__right-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 1rem;
      height: 100%;
    }

    &.combinePanel .bar__left-panel {
      position: static;
    }

    &.combinePanel .bar__right-panel {
      position: static;
    }
  }
</style>
