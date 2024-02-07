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
  import { IssuePriority } from '@hcengineering/tracker'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    Icon,
    Label,
    SelectPopup,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { defaultPriorities, issuePriorities } from '../../utils'

  export let value: IssuePriority = IssuePriority.NoPriority
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = 'min-content'
  export let focusIndex: number | undefined = undefined
  export let onChange: (value: IssuePriority) => void = () => {}

  const dispatch = createEventDispatcher()

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
    if (!isEditable || newPriority == null || value === newPriority) {
      return
    }

    value = newPriority
    dispatch('change', newPriority)
    onChange(newPriority)
  }

  $: prioritiesInfo = defaultPriorities.map((p) => {
    return {
      id: p,
      isSelected: value === p,
      ...issuePriorities[p]
    }
  })
</script>

{#if kind === 'list' || kind === 'list-header'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="priority-container" class:cursor-pointer={isEditable} on:click={handlePriorityEditorOpened}>
    <div class="icon">
      {#if issuePriorities[value]?.icon}<Icon icon={issuePriorities[value]?.icon} {size} />{/if}
    </div>
    {#if shouldShowLabel}
      <span class="{kind === 'list' ? 'ml-2 text-md' : 'ml-3 text-base'} overflow-label disabled content-color">
        <Label label={issuePriorities[value]?.label} />
      </span>
    {/if}
  </div>
{:else}
  <Button
    showTooltip={isEditable ? { label: tracker.string.SetPriority } : undefined}
    label={shouldShowLabel ? issuePriorities[value]?.label : undefined}
    icon={issuePriorities[value]?.icon}
    {justify}
    {focusIndex}
    {width}
    {size}
    {kind}
    disabled={!isEditable}
    on:click={handlePriorityEditorOpened}
  />
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
