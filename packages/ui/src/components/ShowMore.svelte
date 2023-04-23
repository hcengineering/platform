<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import Label from './Label.svelte'
  import ui from '../plugin'
  import { resizeObserver } from '../resize'

  export let limit: number = 240
  export let ignore: boolean = false
  export let fixed: boolean = false

  let cHeight: number
  let bigger: boolean = false
  let crop: boolean = false

  const toggle = (): void => {
    crop = !crop
  }

  $: if (cHeight > limit && !bigger) bigger = true
  $: if (bigger && !ignore) crop = true
</script>

<div class="clear-mins">
  <div
    use:resizeObserver={(element) => {
      cHeight = element.clientHeight
    }}
    class="showMore-content"
    class:crop={!ignore && crop}
    class:full={bigger && !ignore && !crop}
    style={!ignore && crop ? `max-height: ${limit}px;` : ''}
  >
    <slot />
  </div>

  {#if !ignore && bigger && !fixed}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="showMore" class:outter={cHeight > limit} on:click={toggle}>
      <Label label={cHeight > limit ? ui.string.ShowLess : ui.string.ShowMore} />
    </div>
  {/if}
</div>

<style lang="scss">
  .showMore-content {
    max-height: max-content;

    &.crop {
      overflow: hidden;
      max-height: 15rem;
      mask: linear-gradient(to top, rgba(0, 0, 0, 0) 0, black 5rem);
    }
    &.full {
      margin-bottom: 2.25rem;
    }
  }

  .showMore {
    position: absolute;
    left: 50%;
    bottom: 0.25rem;
    padding: 0.5rem 1rem;
    transform: translateX(-50%);

    word-wrap: none;
    font-size: 0.75rem;
    color: var(--theme-caption-color);
    background: var(--theme-list-row-color);
    border: 0.5px solid var(--theme-list-divider-color);
    box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
    border-radius: 2.5rem;
    // z-index: 1;
    user-select: none;
    cursor: pointer;

    &.outter {
      bottom: 0.25rem;
      transform: translateX(-50%);
    }
    &:hover {
      background: var(--theme-list-button-color);
    }
  }
</style>
