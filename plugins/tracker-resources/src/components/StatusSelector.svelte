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
  import { IssueStatus } from '@anticrm/tracker'
  import { Button, Icon, Label, showPopup, SelectPopup } from '@anticrm/ui'
  import { issueStatuses } from '../utils'
  import tracker from '../plugin'

  export let status: IssueStatus
  export let kind: 'button' | 'icon' = 'button'
  export let shouldShowLabel: boolean = true
  export let onStatusChange: ((newStatus: IssueStatus | undefined) => void) | undefined = undefined

  const statusesInfo = [
    IssueStatus.Backlog,
    IssueStatus.Todo,
    IssueStatus.InProgress,
    IssueStatus.Done,
    IssueStatus.Canceled
  ].map((s) => ({ id: s, ...issueStatuses[s] }))

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
    label={shouldShowLabel ? issueStatuses[status].label : undefined}
    icon={issueStatuses[status].icon}
    width="min-content"
    size="small"
    kind="no-border"
    on:click={handleStatusEditorOpened}
  />
{:else if kind === 'icon'}
  <div class="flex-presenter" on:click={handleStatusEditorOpened}>
    <div class="statusIcon">
      <Icon icon={issueStatuses[status].icon} size={'small'} />
    </div>
    {#if shouldShowLabel}
      <div class="label nowrap">
        <Label label={issueStatuses[status].label} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .statusIcon {
    width: 1rem;
    height: 1rem;
  }
</style>
