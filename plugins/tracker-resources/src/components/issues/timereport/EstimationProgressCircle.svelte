<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { FernColor, FlamingoColor, IconSize } from '@hcengineering/ui'

  export let value: number
  export let min: number = 0
  export let max: number = 100
  export let size: IconSize = 'small'
  export let accented: boolean = false

  export let color: string = 'var(--theme-progress-color)'
  export let greenColor: string = FernColor
  export let overdueColor = FlamingoColor

  const lenghtC: number = Math.PI * 14 - 1
  $: procC = lenghtC / (max - min)
  $: dashOffset = (Math.min(value, max) - min) * procC

  $: color = value > max ? overdueColor : value < max ? color : greenColor
</script>

<svg class="svg-{size}" fill="none" viewBox="0 0 16 16">
  <circle
    cx={8}
    cy={8}
    r={7}
    class="progress-circle"
    style:stroke={'var(--theme-caption-color)'}
    style:opacity={'.15'}
    style:transform={`rotate(${-78 + ((dashOffset + 1) * 360) / (lenghtC + 1)}deg)`}
    style:stroke-dasharray={lenghtC}
    style:stroke-dashoffset={dashOffset === 0 ? 0 : dashOffset + 3}
  />
  {#if min !== max && min !== value}
    <circle
      cx={8}
      cy={8}
      r={7}
      class="progress-circle"
      style:stroke={accented ? 'var(--primary-bg-color)' : color}
      style:opacity={dashOffset === 0 ? 0 : 1}
      style:transform={'rotate(-82deg)'}
      style:stroke-dasharray={lenghtC}
      style:stroke-dashoffset={dashOffset === 0 ? lenghtC : lenghtC - dashOffset + 1}
    />
  {/if}
</svg>

<style lang="scss">
  .progress-circle {
    stroke-width: 2px;
    stroke-linecap: round;
    transform-origin: center;
    transition: transform 0.6s ease 0s, stroke-dashoffset 0.6s ease 0s, stroke-dasharray 0.6s ease 0s,
      opacity 0.6s ease 0s;
  }
</style>
