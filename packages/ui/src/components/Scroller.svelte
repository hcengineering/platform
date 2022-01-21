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
  import { afterUpdate, onDestroy, onMount } from 'svelte'

  let mask: string = 'bottom'

  let divScroll: HTMLElement
  let divBox: HTMLElement

  const checkFade = (): void => {
    const t = divScroll.scrollTop
    const b = divScroll.scrollHeight - divScroll.clientHeight - t
    if (t > 0 && b > 0) mask = 'both'
    else if (t > 0) mask = 'bottom'
    else if (b > 0) mask = 'top'
    else mask = 'none'
  }
  onMount(() => { if (divScroll && divBox) divScroll.addEventListener('scroll', checkFade) })
  onDestroy(() => { if (divScroll) divScroll.removeEventListener('scroll', checkFade) })
  afterUpdate(() => { if (divScroll) checkFade() })
</script>

<div bind:this={divScroll} class="scroll relative antiNav-{mask}Fade">
  <div bind:this={divBox} class="box">
    <slot />
  </div>
</div>

<style lang="scss">
  .scroll {
    flex-grow: 1;
    min-height: 0;
    // max-height: 10rem;
    height: max-content;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar-track { margin: 0; }
    &::-webkit-scrollbar-thumb {
      background-color: var(--theme-bg-accent-color);
      &:hover { background-color: var(--theme-menu-divider); }
    }
  }
  .box {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
