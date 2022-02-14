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
  import { afterUpdate } from 'svelte'
  import type { StatesBarPosition } from '../..'

  export let label: string
  export let position: StatesBarPosition = undefined
  export let selected: boolean = false
  export let color: string = 'var(--theme-button-bg-enabled)'

  let lenght: number = 0
  let text: HTMLElement
  let divBar: HTMLElement
  let svgBack: SVGElement

  afterUpdate(() => {
    if (text) lenght = (text.clientWidth + 20 > 300) ? 300 : text.clientWidth + 20
    if (divBar) divBar.style.width = lenght + 20 + 'px'
    if (svgBack) svgBack.style.width = lenght + 20 + 'px'
  })
</script>

<div class="hidden-text" bind:this={text}>{label}</div>
{#if lenght > 0}
  <div
    bind:this={divBar}
    class="asb-bar"
    class:cursor-pointer={!selected}
    class:cursor-default={selected}
    on:click|stopPropagation
  >
    <svg
      bind:this={svgBack}
      class="asb-bar__back"
      viewBox="0 0 {lenght + 20} 36"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      {#if (position === 'start') }
        <path
          class="asb-bar__{selected ? 'selected' : 'element'}"
          style={selected ? `fill: ${color};` : ''}
          d="M0,8c0-4.4,3.6-8,8-8h2h{lenght}h1.8c0.8,0,1.6,0.5,1.9,1.3l6.1,16c0.2,0.5,0.2,1,0,1.4l-6.1,16c-0.3,0.8-1,1.3-1.9,1.3L{lenght + 10},36H10 l-2,0c-4.4,0-8-3.6-8-8V8z"
        />
      {:else if (position === 'middle') }
        <path
          class="asb-bar__{selected ? 'selected' : 'element'}"
          style={selected ? `fill: ${color};` : ''}
          d="M6.1,17.3l-6-15.9C-0.2,0.7,0.3,0,1,0h9h{lenght}h1.8c0.8,0,1.6,0.5,1.9,1.3l6.1,16c0.2,0.5,0.2,1,0,1.4l-6.1,16 c-0.3,0.8-1,1.3-1.9,1.3H{lenght + 10}H10H1c-0.7,0-1.2-0.7-0.9-1.4l6-15.9C6.3,18.3,6.3,17.7,6.1,17.3z"
        />
      {:else if (position === 'end') }
        <path
          class="asb-bar__{selected ? 'selected' : 'element'}"
          style={selected ? `fill: ${color};` : ''}
          d="M6.1,17.3l-6-15.9C-0.2,0.7,0.3,0,1,0h9h{lenght}h2c4.4,0,8,3.6,8,8v20c0,4.4-3.6,8-8,8h-2H10H1 c-0.7,0-1.2-0.7-0.9-1.4l6-15.9C6.3,18.3,6.3,17.7,6.1,17.3z"
        />
      {:else}
        <path
          class="asb-bar__{selected ? 'selected' : 'element'}"
          style={selected ? `fill: ${color};` : ''}
          d="M0,8c0-4.4,3.6-8,8-8l2,0h{lenght}l2,0c4.4,0,8,3.6,8,8v20c0,4.4-3.6,8-8,8h-2H10H8c-4.4,0-8-3.6-8-8V8z"
        />
      {/if}
    </svg>
    <div class="asb-label__container"><div class="overflow-label">{label}</div></div>
  </div>
{/if}
