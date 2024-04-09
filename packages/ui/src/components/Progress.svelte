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
  import { themeStore } from '@hcengineering/theme'
  import { getPlatformColor } from '../colors'
  import { createEventDispatcher } from 'svelte'

  export let value: number
  export let min: number = 0
  export let max: number = 100
  export let color: number | undefined = undefined
  export let editable = false

  $: proc = (max - min) / 100
  if (value > max) value = max
  if (value < min) value = min

  const dispatch = createEventDispatcher()

  function click (e: MouseEvent): void {
    if (!editable) return
    calcValue(e)
    dispatch('change', value)
  }

  function calcValue (e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const pos = x / rect.width
    value = (max - min) * pos
    if (value > max) value = max
    if (value < min) value = min
  }

  function save (): void {
    if (drag) {
      dispatch('change', value)
      drag = false
    }
  }

  function move (e: MouseEvent): void {
    if (!drag) return
    calcValue(e)
  }

  let drag: boolean = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="container" class:editable on:click={click} on:mousemove={move} on:mouseleave={save} on:mouseup={save}>
  <div
    class="bar"
    style="background-color: {color !== undefined
      ? getPlatformColor(color, $themeStore.dark)
      : 'var(--theme-toggle-on-bg-color)'}; width: calc(100% * {proc !== 0
        ? Math.round((value - min) / proc)
        : 0} / 100);"
  />
  {#if editable}
    <div
      class="control"
      on:mousedown={() => {
        drag = true
      }}
      style="left: calc(100% * {proc !== 0 ? Math.round((value - min) / proc) : 0} / 100 - 0.5rem);"
    />
  {/if}
</div>

<style lang="scss">
  .container {
    position: relative;
    width: 100%;
    height: 0.25rem;
    background-color: var(--trans-content-10);
    border-radius: 0.125rem;

    &.editable {
      height: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;

      .bar {
        border-radius: 0.5rem;
      }

      .control {
        position: absolute;
        top: 0;
        height: 1rem;
        width: 1rem;
        border-radius: 50%;
        background-color: var(--caption-color);
        border: 1px solid var(--theme-divider-color);
      }
    }

    .bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 0.125rem;
    }
  }
</style>
