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
  import { getPlatformColor } from '../../colors'
  import { Component, WizardModel, WizardItemPosition, themeStore } from '../..'
  import ScrollerBar from '../ScrollerBar.svelte'
  import WizardStep from './WizardStep.svelte'

  export let items: readonly WizardModel[]
  export let selected = 0
  export let gap: 'none' | 'small' | 'big' = 'none'

  const COLOR = 9

  let divScroll: HTMLElement
  let selectedItem: WizardModel | undefined

  function getPosition (n: number): WizardItemPosition {
    if (n === 0) return 'start'
    else if (n === items.length - 1) return 'end'
    else return 'middle'
  }

  $: selectedItem = items[selected]
</script>

<ScrollerBar {gap} bind:scroller={divScroll}>
  {#each items as item, i}
    <WizardStep
      label={item.label}
      position={getPosition(i)}
      positionState={selected === i ? 'current' : i < selected ? 'prev' : 'next'}
      prevColor={getPlatformColor(COLOR, $themeStore.dark)}
      currentColor={getPlatformColor(COLOR, $themeStore.dark)}
      nextColor="var(--trans-content-10)"
    />
  {/each}
</ScrollerBar>

{#if selectedItem}
  {#if typeof selectedItem.component === 'string'}
    <Component is={selectedItem.component} props={selectedItem.props} on:change />
  {:else}
    <svelte:component this={selectedItem.component} {...selectedItem.props} on:change />
  {/if}
{/if}
