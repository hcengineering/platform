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
  import { statusStore } from '@hcengineering/view-resources'
  import StateEditor from './StateEditor.svelte'
  import StatePresenter from './StatePresenter.svelte'

  export let value: Ref<Status>
  export let space: Ref<Project>
  export let onChange: ((value: Ref<Status>) => void) | undefined = undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let shouldShowName: boolean = true
  export let shrink: number = 1
  export let disabled: boolean = false

  import { selectedTaskTypeStore, selectedTypeStore } from '../../index'

  $: state = $statusStore.byId.get(value)
</script>

{#if value}
  {#if onChange !== undefined && state !== undefined}
    <StateEditor value={state._id} {space} {onChange} {kind} {size} {shouldShowName} {shrink} {disabled} />
  {:else}
    <StatePresenter
      value={state}
      {space}
      {shouldShowName}
      {disabled}
      {shrink}
      on:accent-color
      taskType={$selectedTaskTypeStore}
      projectType={$selectedTypeStore}
    />
  {/if}
{/if}
