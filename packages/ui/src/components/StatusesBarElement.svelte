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
  export let side: 'left' | 'right'
  export let kind: 'round' | 'arrow'
  export let selected: boolean = false
</script>

<svg
  width=".5rem" height="2.25rem" viewBox="0 0 8 36"
  class:selected
  xmlns="http://www.w3.org/2000/svg"
>
  {#if side === 'left' && kind === 'arrow'}
    <path class="bg" d="M1,0C0.3,0-0.2,0.7,0.1,1.4l6,15.9c0.2,0.5,0.2,1,0,1.4l-6,15.9C-0.2,35.3,0.3,36,1,36h7V0H1z"/>
    <path class="border" d="M1,35l6-15.9c0.3-0.7,0.3-1.4,0-2.1L1,1h7V0H1C0.7,0,0.4,0.2,0.2,0.4C0,0.7-0.1,1,0.1,1.4 l6,15.9c0.2,0.5,0.2,1,0,1.4l-6,15.9C-0.1,35,0,35.3,0.2,35.6S0.7,36,1,36h7v-1H1z"/>
  {:else if side === 'left' && kind === 'round'}
    <path class="bg" d="M0,8v10v10c0,4.4,3.6,8,8,8V0C3.6,0,0,3.6,0,8z"/>
    <path class="border" d="M1,28V8c0-3.9,3.1-7,7-7V0C3.6,0,0,3.6,0,8v20c0,4.4,3.6,8,8,8v-1C4.1,35,1,31.9,1,28z"/>
  {:else if side === 'right' && kind === 'arrow'}
    <path class="bg" d="M1.8,1.3C1.5,0.5,0.8,0,0,0v36c0.8,0,1.5-0.5,1.8-1.3l6.1-16c0.2-0.5,0.2-1,0-1.4L1.8,1.3z"/>
    <path class="border" d="M1.8,1.3L1.8,1.3L1.8,1.3c0,0-0.1-0.2-0.1-0.3L1.6,0.8C1.2,0.3,0.6,0,0,0v1 c0.4,0,0.7,0.3,0.9,0.6l6.1,16c0.1,0.2,0.1,0.5,0,0.7l-6.1,16C0.7,34.7,0.4,35,0,35v1c0.8,0,1.5-0.5,1.8-1.3l6.1-16 c0.2-0.5,0.2-1,0-1.4L1.8,1.3z"/>
  {:else if side === 'right' && kind === 'round'}
    <path class="bg" d="M0,0v36c4.4,0,8-3.6,8-8V8C8,3.6,4.4,0,0,0z"/>
    <path class="border" d="M0,0v1c3.9,0,7,3.1,7,7v20c0,3.9-3.1,7-7,7v1c4.4,0,8-3.6,8-8V8C8,3.6,4.4,0,0,0z"/>
  {:else}
    <rect x={0} y={0} width={'100%'} height={'100%'} fill={'red'} opacity={.5} />
  {/if}
</svg>

<style lang="scss">
  .bg { fill: var(--theme-button-bg-enabled); }
  .border { fill: var(--theme-button-border-enabled); }
  .selected {
    .bg { fill: var(--dark-turquoise-01); }
    .border { fill: transparent; }
  }
</style>
