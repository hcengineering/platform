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
  import { ToDo } from '@hcengineering/time'
  import time from '../plugin'
  import WorkItemPresenter from './WorkItemPresenter.svelte'
  import { getCurrentAccount } from '@hcengineering/core'
  import calendar from '@hcengineering/calendar'
  import { CheckBox, Label } from '@hcengineering/ui'

  export let value: ToDo
  export let withoutSpace: boolean = false
  export let showCheck = false

  const me = getCurrentAccount().uuid
  function isVisible (value: ToDo): boolean {
    if (value.createdBy === me) return true
    if (value.visibility === 'public') {
      return true
    }
    return false
  }

  $: visible = isVisible(value)
</script>

{#if showCheck}
  <div class="flex-row-center items-start">
    <div class="mt-0-5">
      <CheckBox readonly checked={value.doneOn != null} kind={'positive'} size={'medium'} />
    </div>
    <div class="ml-2 flex-col">
      <div class="overflow-label flex-no-shrink">
        {#if visible}
          {value.title}
        {:else}
          <Label label={calendar.string.Busy} />
        {/if}
      </div>
      {#if value.attachedTo !== time.ids.NotAttached && visible}
        <div class:mt-1={value.title}>
          <WorkItemPresenter todo={value} {withoutSpace} />
        </div>
      {/if}
    </div>
  </div>
{:else}
  <div class="flex-col flex-gap-1">
    <div class="overflow-label flex-no-shrink">
      {#if visible}
        {value.title}
      {:else}
        <Label label={calendar.string.Busy} />
      {/if}
    </div>
    {#if value.attachedTo !== time.ids.NotAttached && visible}
      <div>
        <WorkItemPresenter todo={value} {withoutSpace} />
      </div>
    {/if}
  </div>
{/if}
