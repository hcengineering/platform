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
  import { Button, Icon, Label, showPopup, SelectPopup, eventToHTMLElement } from '@anticrm/ui'
  import { ProjectStatus } from '@anticrm/tracker'
  import tracker from '../../plugin'
  import { projectStatuses } from '../../utils'

  export let status: ProjectStatus
  export let kind: 'button' | 'icon' = 'button'
  export let shouldShowLabel: boolean = true
  export let onStatusChange: ((newStatus: ProjectStatus | undefined) => void) | undefined = undefined
  export let isEditable: boolean = true

  const statusesInfo = [
    ProjectStatus.Planned,
    ProjectStatus.InProgress,
    ProjectStatus.Paused,
    ProjectStatus.Completed,
    ProjectStatus.Canceled
  ].map((s) => ({ id: s, ...projectStatuses[s] }))

  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      onStatusChange
    )
  }
</script>

{#if kind === 'button'}
  <Button
    label={shouldShowLabel ? projectStatuses[status].label : undefined}
    icon={projectStatuses[status].icon}
    width="min-content"
    size="small"
    kind="no-border"
    on:click={handleStatusEditorOpened}
  />
{:else if kind === 'icon'}
  <div class={isEditable ? 'flex-presenter' : 'presenter'} on:click={handleStatusEditorOpened}>
    <div class="statusIcon">
      <Icon icon={projectStatuses[status].icon} size="small" />
    </div>
    {#if shouldShowLabel}
      <div class="label nowrap ml-2">
        <Label label={projectStatuses[status].label} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .presenter {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
  }

  .statusIcon {
    width: 1rem;
    height: 1rem;
  }
</style>
