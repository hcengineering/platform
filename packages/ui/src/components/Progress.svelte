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
  export let value: number
  export let min: number = 0
  export let max: number = 100
  export let color: number = 5
  export let editable = false

  $: proc = (max - min) / 100
  if (value > max) value = max
  if (value < min) value = min

  function click (e: MouseEvent) {
    if (!editable) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const pos = x / rect.width
    value = (max - min) * pos
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="container" on:click={click} class:cursor-pointer={editable}>
  <div
    class="bar"
    style="background-color: {getPlatformColor(color, $themeStore.dark)}; width: calc(100% * {proc !== 0
      ? Math.round((value - min) / proc)
      : 0} / 100);"
  />
</div>

<style lang="scss">
  .container {
    position: relative;
    width: 100%;
    height: 0.25rem;
    background-color: var(--trans-content-10);
    border-radius: 0.125rem;

    .bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 0.125rem;
    }
  }
</style>
