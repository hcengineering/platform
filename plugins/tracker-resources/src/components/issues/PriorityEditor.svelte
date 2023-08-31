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
  import { AttachedData } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueDraft, IssuePriority, IssueTemplateData } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    eventToHTMLElement,
    Icon,
    Label,
    SelectPopup,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { defaultPriorities, issuePriorities } from '../../utils'

  export let value: Issue | AttachedData<Issue> | IssueTemplateData | IssueDraft
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
  export let focusIndex: number | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()
  $: selectedPriority = value.priority

  const handlePriorityEditorOpened = (event: MouseEvent) => {
    event.stopPropagation()

    if (!isEditable) {
      return
    }

    showPopup(
      SelectPopup,
      { value: prioritiesInfo, placeholder: tracker.string.SetPriority, searchable: true },
      eventToHTMLElement(event),
      changePriority
    )
  }

  const changePriority = async (newPriority: IssuePriority | undefined) => {
    if (!isEditable || newPriority === undefined || value.priority === newPriority) {
      return
    }

    selectedPriority = newPriority
    dispatch('change', newPriority)

    if ('_class' in value) {
      await client.update(value, { priority: newPriority })
    }
  }

  $: prioritiesInfo = defaultPriorities.map((p) => {
    return {
      id: p,
      isSelected: selectedPriority === p,
      ...issuePriorities[p]
    }
  })
</script>

{#if value}
  {#if kind === 'list' || kind === 'list-header'}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="priority-container" class:cursor-pointer={isEditable} on:click={handlePriorityEditorOpened}>
      <div class="icon">
        {#if issuePriorities[value.priority]?.icon}<Icon icon={issuePriorities[value.priority]?.icon} {size} />{/if}
      </div>
      {#if shouldShowLabel}
        <span class="{kind === 'list' ? 'ml-2 text-md' : 'ml-3 text-base'} overflow-label disabled content-color">
          <Label label={issuePriorities[value.priority]?.label} />
        </span>
      {/if}
    </div>
  {:else}
    <Button
      showTooltip={isEditable ? { label: tracker.string.SetPriority } : undefined}
      label={shouldShowLabel ? issuePriorities[value.priority]?.label : undefined}
      icon={issuePriorities[value.priority]?.icon}
      {justify}
      {focusIndex}
      {width}
      {size}
      {kind}
      disabled={!isEditable}
      on:click={handlePriorityEditorOpened}
    />
  {/if}
{/if}

<style lang="scss">
  .priority-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;

    .icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--theme-caption-color);
    }
    &:hover {
      .icon {
        color: var(--theme-caption-color) !important;
      }
    }
  }
</style>
