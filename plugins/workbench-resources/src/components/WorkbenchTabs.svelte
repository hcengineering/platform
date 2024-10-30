<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { createTab, tabsStore, tabIdStore } from '../workbench'
  import { WorkbenchTabs } from '../index'
  import WorkbenchTabPresenter from './WorkbenchTabPresenter.svelte'
  import {
    IconAdd,
    IconMoreH,
    ButtonIcon,
    ScrollerBar,
    deviceOptionsStore as deviceInfo,
    checkAdaptiveMatching,
    showPopup
  } from '@hcengineering/ui'

  export let popup: boolean = false

  let scroller: HTMLElement
  let element: HTMLButtonElement
  let pressed: boolean = false

  $: devSize = $deviceInfo.size
  $: mini = checkAdaptiveMatching(devSize, 'md')
  $: selectedTab = $tabsStore.find((ts) => ts._id === $tabIdStore)

  const showTabs = (): void => {
    pressed = true
    showPopup(WorkbenchTabs, { popup: true }, element, () => {
      pressed = false
    })
  }
</script>

<div
  class={popup ? 'selectPopup' : 'flex-row-center flex-gap-2'}
  style:padding={popup ? '.5rem' : mini ? '.25rem .25rem .25rem 0' : '0 .25rem 0 0'}
>
  {#if popup}
    <div class="scroll">
      <div class="box flex-gap-1">
        {#each $tabsStore.filter((ts) => ts._id !== $tabIdStore) as tab (tab._id)}
          <WorkbenchTabPresenter {tab} />
        {/each}
      </div>
    </div>
  {:else if !mini}
    <ScrollerBar bind:scroller padding={'.25rem 0'}>
      {#each $tabsStore as tab (tab._id)}
        <WorkbenchTabPresenter {tab} />
      {/each}
    </ScrollerBar>
  {:else if selectedTab !== undefined}
    <WorkbenchTabPresenter tab={selectedTab} />
    <ButtonIcon
      bind:element
      icon={IconMoreH}
      size={'extra-small'}
      kind={'tertiary'}
      hasMenu
      {pressed}
      on:click={showTabs}
    />
  {/if}
  {#if !popup}
    <ButtonIcon icon={IconAdd} size={'extra-small'} kind={'tertiary'} on:click={createTab} />
  {/if}
</div>
