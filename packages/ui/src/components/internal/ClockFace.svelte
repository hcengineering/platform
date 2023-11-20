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

  export let timeZone: string
  export let size: string = '80px'

  const clock: Array<{ value: number, class: string }> = [
    { value: 0, class: 'hour-arrow' },
    { value: 0, class: 'minute-arrow' },
    { value: 0, class: 'second-arrow' }
  ]
  let reqId: any

  const updateTime = (): void => {
    const now = new Date()
    const offNow = timeZone === '' ? now : new Date(now.toLocaleString('en-US', { timeZone }))
    const diffTZ = now.getTime() - offNow.getTime()
    const realTime = new Date(now.getTime() - diffTZ)
    const startDay = new Date(realTime.getFullYear(), realTime.getMonth(), realTime.getDate(), 0, 0, 0).getTime()
    const diff = realTime.getTime() - startDay
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
  onDestroy(() => {
    clearInterval(reqId)
  })
</script>

<div style:--clockface-size={size} class="clockFace-container">
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
    height: calc(var(--clockface-size, 64px) / 32);
    background: var(--theme-clockface-hours);
    transform-origin: 50% calc(calc(var(--clockface-size, 64px) / 2) - 1px); // 29px;
    transform: rotate(0deg);

    @for $i from 2 through 12 {
      &:nth-child(#{$i}) {
        transform: rotate(#{$i * 30 - 30}deg);
      }
    }
    &:nth-child(3n + 1) {
      height: calc(var(--clockface-size, 64px) / 16);
      background: var(--theme-clockface-quarter);
    }
  }

  .clockFace-container {
    --clockface-radius: calc(var(--clockface-size, 64px) / 2);
    --clockface-arrow-end: calc(var(--clockface-size, 64px) / 16);
    --clockface-sec-arrow: calc(calc(var(--clockface-radius) - 2px) + var(--clockface-arrow-end));
    --clockface-min-arrow: calc(calc(var(--clockface-radius) * 0.75) + var(--clockface-arrow-end));
    --clockface-hour-arrow: calc(calc(var(--clockface-radius) * 0.5) + var(--clockface-arrow-end));
    position: relative;
    flex-shrink: 0;
    width: var(--clockface-size, 64px);
    height: var(--clockface-size, 64px);
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
    .second-arrow {
      top: 2px;
      width: 2px;
      height: var(--clockface-sec-arrow);
      background: var(--theme-clockface-sec-arrow);
      transform-origin: 50% calc(var(--clockface-radius) - 2px);

      &::before,
      &::after {
        content: '';
        position: absolute;
        left: 50%;
        border-radius: 50%;
        transform: translateX(-50%);
      }
      &::before {
        top: calc(var(--clockface-radius) - 5px);
        width: 6px;
        height: 6px;
        background-color: var(--theme-clockface-sec-holder);
      }
      &::after {
        top: calc(var(--clockface-radius) - 4px);
        width: 4px;
        height: 4px;
        background: var(--theme-clockface-arrows-holder);
      }
    }
    .minute-arrow {
      top: calc(var(--clockface-radius) * 0.25);
      width: 2px;
      height: var(--clockface-min-arrow);
      background: var(--theme-clockface-min-arrow);
      transform-origin: 50% calc(var(--clockface-min-arrow) - var(--clockface-arrow-end));
    }
    .hour-arrow {
      top: calc(var(--clockface-radius) * 0.5);
      left: calc(50% - 1px);
      width: 3px;
      height: var(--clockface-hour-arrow);
      background: var(--theme-clockface-min-arrow);
      transform-origin: 50% calc(var(--clockface-hour-arrow) - var(--clockface-arrow-end));
    }
  }
</style>
