<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Ref, WithLookup } from '@anticrm/core'

  import { IssueStatus } from '@anticrm/tracker'
  import { Button, Icon, showPopup, SelectPopup } from '@anticrm/ui'
  import tracker from '../plugin'

  export let selectedStatusId: Ref<IssueStatus>
  export let statuses: WithLookup<IssueStatus>[]
  export let kind: 'button' | 'icon' = 'button'
  export let shouldShowLabel: boolean = true
  export let onStatusChange: ((newStatus: Ref<IssueStatus> | undefined) => void) | undefined = undefined

  $: selectedStatus = statuses.find((status) => status._id === selectedStatusId) ?? statuses[0]
  $: selectedStatusIcon = selectedStatus?.$lookup?.category?.icon
  $: selectedStatusLabel = shouldShowLabel ? selectedStatus?.name : undefined
  $: statusesInfo = statuses.map((s) => ({ id: s._id, text: s.name, color: s.color, icon: s.$lookup?.category?.icon }))

  const handleStatusEditorOpened = (event: Event) => {
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      event.currentTarget,
      onStatusChange
    )
  }
</script>

{#if kind === 'button'}
  <Button
    icon={selectedStatusIcon}
    width="min-content"
    size="small"
    kind="no-border"
    on:click={handleStatusEditorOpened}
  >
  <svelte:fragment slot="content">
    {#if selectedStatusLabel}
      <span class="nowrap">{selectedStatusLabel}</span>
    {/if}
  </svelte:fragment>
</Button>
{:else if kind === 'icon'}
  <div class="flex-presenter" on:click={handleStatusEditorOpened}>
    {#if selectedStatusIcon}
      <div class="statusIcon">
        <Icon icon={selectedStatusIcon} size="small" />
      </div>
    {/if}
    {#if selectedStatusLabel}
      <div class="label nowrap">{selectedStatusLabel}</div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .statusIcon {
    width: 1rem;
    height: 1rem;
  }
</style>
