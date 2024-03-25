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
  export let row: number = 0
  export let colorsSchema: 'default' | 'lumia' = 'default'
  export let addClass: string | undefined = undefined
  export let selected = false
  export let element: HTMLElement | undefined = undefined
  export let kind: 'default' | 'thin' | 'full-size' = 'default'
  export let isHighlighted = false
</script>

<slot name="category" item={row} />
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="list-item{addClass ? ` ${addClass}` : ''} {kind}"
  class:selection={selected}
  class:lumia={colorsSchema === 'lumia'}
  class:default={colorsSchema === 'default'}
  class:highlighted={isHighlighted}
  on:mouseover
  on:mouseenter
  on:focus={() => {}}
  bind:this={element}
  on:click
>
  <slot name="item" item={row} />
</div>

<style lang="scss">
  .list-item {
    margin: 0 0.5rem;
    min-width: 0;
    border-radius: 0.25rem;

    &.thin {
      margin: 0 0.375rem;
      border-radius: 0.375rem;

      &:not(:first-child) {
        margin-top: 0.375rem;
      }
    }

    &.full-size {
      margin: 0;
    }

    &.default {
      &:hover:not(.highlighted) {
        background-color: var(--theme-popup-divider);
      }
    }

    &.lumia {
      &:hover:not(.highlighted) {
        background-color: var(--global-ui-highlight-BackgroundColor);
      }
    }

    &.selection:not(.highlighted) {
      &.default {
        background-color: var(--theme-popup-hover);
      }

      &.lumia {
        background-color: var(--global-ui-highlight-BackgroundColor);
      }
    }

    &.highlighted {
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
  }
</style>
