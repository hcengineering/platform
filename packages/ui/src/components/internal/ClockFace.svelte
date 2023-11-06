<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { onDestroy } from 'svelte'

  const clock: Array<{ value: number; class: string }> = [
    { value: 0, class: 'hour-arrow' },
    { value: 0, class: 'minute-arrow' },
    { value: 0, class: 'second-arrow' }
  ]
  let reqId: any

  const updateTime = (): void => {
    const now = new Date()
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime()
    const diff = now.getTime() - startDay
    let h = diff / 3600000
    if (h > 12) h -= 12
    const m = (diff / 1000 / 60) % 60
    const s = (diff / 1000) % 60
    clock[0].value = h * 30
    clock[1].value = m * 6
    clock[2].value = s * 6
    setTimeout(() => (reqId = requestAnimationFrame(updateTime)), 1000 / 25)
  }

  reqId = requestAnimationFrame(updateTime)
  onDestroy(() => clearInterval(reqId))
</script>

<div class="clockFace-container">
  {#each [...Array(12).keys()] as hour}
    <div class="hour" data-hour={hour === 0 ? '12' : `${hour}`} />
  {/each}
  {#each clock as arrow}
    <div class={arrow.class} style:transform={`rotate(${arrow.value}deg)`} />
  {/each}
</div>

<style lang="scss">
  .hour {
    position: absolute;
    top: 1px;
    left: 50%;
    width: 1px;
    height: 2px;
    background: var(--theme-clockface-hours);
    transform-origin: 50% 29px;
    transform: rotate(0deg);

    @for $i from 2 through 12 {
      &:nth-child(#{$i}) {
        transform: rotate(#{$i * 30 - 30}deg);
      }
    }
    &:nth-child(3n + 1) {
      height: 5px;
      background: var(--theme-clockface-quarter);
    }
  }

  .clockFace-container {
    position: relative;
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    background: var(--theme-clockface-back);
    border-radius: 50%;
    box-shadow: var(--theme-clockface-shadow);

    .second-arrow,
    .minute-arrow,
    .hour-arrow {
      position: absolute;
      left: calc(50% - 0.5px);
      box-shadow: va(--theme-clockface-arrows-shadow);
      transform: rotate(0deg);
    }
    .anim {
      transition-property: transform;
      transition-timing-function: var(--timing-clock);
      transition-duration: 0.25s;
    }
    .second-arrow {
      top: 2px;
      width: 2px;
      height: 34px;
      background: var(--theme-clockface-sec-arrow);
      transform-origin: 50% 28px;

      &::before,
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        border-radius: 50%;
        transform: translateX(-50%);
      }
      &::before {
        top: 25px;
        width: 6px;
        height: 6px;
        background-color: var(--theme-clockface-sec-holder);
      }
      &::after {
        top: 26px;
        width: 4px;
        height: 4px;
        background: var(--theme-clockface-arrows-holder);
      }
    }
    .minute-arrow {
      top: 4px;
      width: 2px;
      height: 32px;
      background: var(--theme-clockface-min-arrow);
      transform-origin: 50% 26px;
    }
    .hour-arrow {
      top: 12px;
      left: calc(50% - 1px);
      width: 3px;
      height: 24px;
      background: var(--theme-clockface-min-arrow);
      transform-origin: 50% 18px;
    }
  }
</style>
