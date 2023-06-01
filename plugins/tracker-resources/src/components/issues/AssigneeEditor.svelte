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
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { AssigneeBox, employeeAccountByIdStore } from '@hcengineering/contact-resources'
  import { AttachedData, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueDraft, IssueTemplateData } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, IconSize, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { getPreviousAssignees } from '../../utils'

  export let object: Issue | AttachedData<Issue> | IssueTemplateData | IssueDraft
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let avatarSize: IconSize = 'card'
  export let tooltipAlignment: TooltipAlignment | undefined = undefined
  export let width: string = '100%'
  export let focusIndex: number | undefined = undefined
  export let short: boolean = false
  export let shouldShowName = true

  const client = getClient()
  const dispatch = createEventDispatcher()

  let prevAssigned: Ref<Employee>[] = []
  let componentLead: Ref<Employee> | undefined = undefined
  let members: Ref<Employee>[] = []

  $: '_class' in object &&
    getPreviousAssignees(object).then((res) => {
      prevAssigned = res
    })

  function hasSpace (issue: Issue | AttachedData<Issue> | IssueTemplateData | IssueDraft): issue is Issue {
    return (issue as Issue).space !== undefined
  }

  async function updateComponentMembers (issue: Issue | AttachedData<Issue> | IssueTemplateData | IssueDraft) {
    if (issue.component) {
      const component = await client.findOne(tracker.class.Component, { _id: issue.component })
      componentLead = component?.lead || undefined
    } else {
      componentLead = undefined
    }
    if (hasSpace(issue)) {
      const project = await client.findOne(tracker.class.Project, { _id: issue.space })
      if (project !== undefined) {
        const accounts = project.members
          .map((p) => $employeeAccountByIdStore.get(p as Ref<EmployeeAccount>))
          .filter((p) => p !== undefined) as EmployeeAccount[]
        members = accounts.map((p) => p.employee)
      } else {
        members = []
      }
    }
  }

  $: updateComponentMembers(object)

  const handleAssigneeChanged = async (newAssignee: Ref<Employee> | undefined) => {
    if (newAssignee === undefined || object.assignee === newAssignee) {
      return
    }

    dispatch('change', newAssignee)

    if ('_class' in object) {
      await client.update(object, { assignee: newAssignee })
    }
  }
</script>

{#if object}
  <AssigneeBox
    {focusIndex}
    label={tracker.string.Assignee}
    placeholder={tracker.string.Assignee}
    value={object.assignee}
    {prevAssigned}
    {componentLead}
    {members}
    titleDeselect={tracker.string.Unassigned}
    {size}
    {kind}
    {avatarSize}
    {width}
    {short}
    {shouldShowName}
    showNavigate={false}
    justify={'left'}
    showTooltip={{
      personLabel: tracker.string.AssignedTo,
      placeholderLabel: tracker.string.Unassigned,
      direction: tooltipAlignment
    }}
    on:change={({ detail }) => handleAssigneeChanged(detail)}
  />
{/if}
