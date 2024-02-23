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
  import { Ref, Status } from '@hcengineering/core'
  import { Project } from '@hcengineering/task'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { Button, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import StatePresenter from './StatePresenter.svelte'
  import StatesPopup from './StatesPopup.svelte'
  import { selectedTaskTypeStore, selectedTypeStore } from '../../index'

  export let value: Ref<Status>
  export let space: Ref<Project>
  export let onChange: (value: any) => void
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let width: string = 'min-content'
  export let justify: 'left' | 'center' = 'center'
  export let shouldShowName: boolean = true
  export let shrink: number = 0
  export let disabled: boolean = false

  $: state = $statusStore.byId.get(value)
  let opened: boolean = false

  const handleClick = (ev: MouseEvent) => {
    if (!opened) {
      opened = true
      showPopup(StatesPopup, { space }, eventToHTMLElement(ev), (result) => {
        if (result && result._id !== value) {
          value = result._id
          onChange(value)
        }
        opened = false
      })
    }
  }
</script>

{#if kind === 'list' || kind === 'list-header'}
  <StatePresenter
    value={state}
    {space}
    {shouldShowName}
    {disabled}
    shouldShowTooltip
    on:click={handleClick}
    taskType={$selectedTaskTypeStore}
    projectType={$selectedTypeStore}
  />
{:else}
  <Button {kind} {size} {width} {justify} {shrink} {disabled} on:click={handleClick}>
    <svelte:fragment slot="content">
      {#if state}
        <div class="pointer-events-none clear-mins">
          <StatePresenter value={state} {space} {shouldShowName} {disabled} />
        </div>
      {/if}
    </svelte:fragment>
  </Button>
{/if}
