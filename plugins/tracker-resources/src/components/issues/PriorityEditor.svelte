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
  import { Issue, IssueDraft, IssuePriority, IssueTemplateData, TrackerEvents } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'

  import PriorityInlineEditor from './PriorityInlineEditor.svelte'

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

  const changePriority = async (newPriority: IssuePriority | undefined) => {
    if (!isEditable || newPriority == null || value.priority === newPriority) {
      return
    }

    selectedPriority = newPriority
    dispatch('change', newPriority)

    if ('_class' in value) {
      await client.update(value, { priority: newPriority })
      Analytics.handleEvent(TrackerEvents.IssueSetPriority, {
        issue: value.identifier,
        priority: newPriority
      })
    }
  }
</script>

<PriorityInlineEditor
  {kind}
  {size}
  {justify}
  {width}
  {focusIndex}
  {shouldShowLabel}
  {isEditable}
  bind:value={selectedPriority}
  on:change={(e) => changePriority(e.detail)}
/>
