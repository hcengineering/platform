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
  import { createEventDispatcher } from 'svelte'
  import { AttachedData } from '@anticrm/core'
  import { Issue, IssuePriority } from '@anticrm/tracker'
  import { getClient } from '@anticrm/presentation'
  import { Button, eventToHTMLElement } from '@anticrm/ui'
  import { ButtonKind, ButtonSize, showPopup, SelectPopup } from '@anticrm/ui'
  import tracker from '../../plugin'
  import { defaultPriorities, issuePriorities } from '../../utils'

  export let value: Issue | AttachedData<Issue>
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined

  const client = getClient()
  const dispatch = createEventDispatcher()
  const prioritiesInfo = defaultPriorities.map((p) => ({ id: p, ...issuePriorities[p] }))

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

    dispatch('change', newPriority)

    if ('_id' in value) {
      await client.update(value, { priority: newPriority })
    }
  }
</script>

{#if value}
  <Button
    showTooltip={isEditable ? { label: tracker.string.SetPriority } : undefined}
    label={shouldShowLabel ? issuePriorities[value.priority].label : undefined}
    icon={issuePriorities[value.priority].icon}
    {justify}
    {width}
    {size}
    {kind}
    disabled={!isEditable}
    on:click={handlePriorityEditorOpened}
  />
{/if}
