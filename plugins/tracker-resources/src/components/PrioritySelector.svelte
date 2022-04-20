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
  import { IssuePriority } from '@anticrm/tracker'
  import { Button, showPopup, SelectPopup, Icon, Label, eventToHTMLElement } from '@anticrm/ui'
  import { issuePriorities } from '../utils'
  import tracker from '../plugin'

  export let priority: IssuePriority
  export let kind: 'button' | 'icon' = 'button'
  export let shouldShowLabel: boolean = true
  export let onPriorityChange: ((newPriority: IssuePriority | undefined) => void) | undefined = undefined
  export let isEditable: boolean = true

  const prioritiesInfo = [
    IssuePriority.NoPriority,
    IssuePriority.Urgent,
    IssuePriority.High,
    IssuePriority.Medium,
    IssuePriority.Low
  ].map((p) => ({ id: p, ...issuePriorities[p] }))

  const handlePriorityEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: prioritiesInfo, placeholder: tracker.string.SetPriority, searchable: true },
      eventToHTMLElement(event),
      onPriorityChange
    )
  }
</script>

{#if kind === 'button'}
  <Button
    label={shouldShowLabel ? issuePriorities[priority].label : undefined}
    icon={issuePriorities[priority].icon}
    width="min-content"
    size="small"
    kind="no-border"
    on:click={handlePriorityEditorOpened}
  />
{:else if kind === 'icon'}
  <div class={isEditable ? 'flex-presenter' : 'presenter'} on:click={handlePriorityEditorOpened}>
    <div class="priorityIcon" class:mPriorityIconEditable={isEditable}>
      <Icon icon={issuePriorities[priority].icon} size={'small'} />
    </div>
    {#if shouldShowLabel}
      <div class="label nowrap ml-2">
        <Label label={issuePriorities[priority].label} />
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

  .priorityIcon {
    width: 1rem;
    height: 1rem;
    color: var(--theme-content-dark-color);

    &.mPriorityIconEditable {
      &:hover {
        color: var(--theme-caption-color);
      }
    }
  }
</style>
