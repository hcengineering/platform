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
  export let values: Progress[]
  export let min: number = 0
  export let max: number = 100

  interface Progress {
    value: number
    color: number
  }

  $: filtred = values.filter((p) => p.value > min)

  $: proc = (max - min) / 100

  const width: number[] = []
  $: width.length = filtred.length

  function getLeft (width: number[], i: number): number {
    let res = 0
    for (let index = 0; index < width.length; index++) {
      if (index === i) break
      res += width[index]
    }
    return res
  }

  function getWidth (values: Progress[], i: number): number {
    let value = values[i].value
    if (value > max) value = max
    if (value < min) value = min

    const res = Math.round((value - min) / proc)
    width[i] = res
    return res
  }
</script>

<div class="container">
  {#each filtred as item, i}
    <div
      class="bar fs-title"
      class:first={i === 0}
      class:last={i === filtred.length - 1}
      style="background-color: {getPlatformColor(item.color, $themeStore.dark)}; left: {getLeft(
        width,
        i
      )}%; width: calc(100% * {proc !== 0 ? getWidth(filtred, i) : 0} / 100);"
    >
      {item.value}
    </div>
  {/each}
</div>

<style lang="scss">
  .container {
    position: relative;
    width: 100%;
    height: 1.5rem;
    background-color: var(--theme-list-row-color);
    border: 1px solid var(--theme-list-divider-color);
    border-radius: 0.25rem;

    .bar {
      position: absolute;
      display: flex;
      align-items: center;
      top: 0;
      left: 0;
      height: 100%;
      padding-left: 0.5rem;
      &.first {
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
      }
      &.last {
        border-top-right-radius: 0.25rem;
        border-bottom-right-radius: 0.25rem;
      }
    }
  }
</style>
