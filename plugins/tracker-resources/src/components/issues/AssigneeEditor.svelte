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
  import { Employee } from '@hcengineering/contact'
  import { AttachedData, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueTemplateData } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import AssigneeBox from './AssigneeBox.svelte'

  export let value: Issue | AttachedData<Issue> | IssueTemplateData
  export let size: ButtonSize = 'large'
  export let kind: ButtonKind = 'link'
  export let tooltipAlignment: TooltipAlignment | undefined = undefined
  export let width: string = '100%'

  const client = getClient()
  const dispatch = createEventDispatcher()

  const handleAssigneeChanged = async (newAssignee: Ref<Employee> | undefined) => {
    if (newAssignee === undefined || value.assignee === newAssignee) {
      return
    }

    dispatch('change', newAssignee)

    if ('_id' in value) {
      await client.update(value, { assignee: newAssignee })
    }
  }
</script>

{#if value}
  <AssigneeBox
    label={tracker.string.Assignee}
    placeholder={tracker.string.Assignee}
    value={value.assignee}
    assignedTo={value}
    titleDeselect={tracker.string.Unassigned}
    {size}
    {kind}
    {width}
    showNavigate={false}
    justify={'left'}
    showTooltip={{ label: tracker.string.AssignTo, direction: tooltipAlignment }}
    on:change={({ detail }) => handleAssigneeChanged(detail)}
  />
{/if}
