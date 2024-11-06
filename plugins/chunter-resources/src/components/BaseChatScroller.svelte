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
  import { Loading, Scroller } from '@hcengineering/ui'

  export let scroller: Scroller | undefined | null = undefined
  export let scrollDiv: HTMLDivElement | undefined | null = undefined
  export let contentDiv: HTMLDivElement | undefined | null = undefined
  export let loadingOverlay: boolean = false
  export let onScroll: () => void = () => {}
  export let onResize: () => void = () => {}
</script>

{#if loadingOverlay}
  <div class="overlay">
    <Loading />
  </div>
{/if}
<Scroller
  bind:this={scroller}
  bind:divScroll={scrollDiv}
  bind:divBox={contentDiv}
  scrollDirection="vertical-reverse"
  noStretch
  bottomStart
  disableOverscroll
  disablePointerEventsOnScroll
  {onScroll}
  {onResize}
>
  <slot />
</Scroller>

<style lang="scss">
  .overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    background: var(--theme-panel-color);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
