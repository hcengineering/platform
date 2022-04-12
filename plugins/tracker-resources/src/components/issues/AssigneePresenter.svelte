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
  import contact, { Employee, formatName } from '@anticrm/contact'
  import { Ref, WithLookup } from '@anticrm/core'
  import { Issue, Team } from '@anticrm/tracker'
  import { Avatar, UsersPopup, getClient } from '@anticrm/presentation'
  import { showPopup, Tooltip } from '@anticrm/ui'

  import tracker from '../../plugin'

  export let value: WithLookup<Issue>
  export let currentSpace: Ref<Team> | undefined = undefined

  $: employee = value?.$lookup?.assignee as Employee | undefined
  $: avatar = employee?.avatar
  $: formattedName = employee?.name ? formatName(employee.name) : ''

  const client = getClient()

  const handleAssigneeChanged = async (result: Employee | null | undefined) => {
    if (result === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: value._id })

    if (currentIssue === undefined) {
      return
    }

    const newAssignee = result === null ? null : result._id

    await client.update(currentIssue, { assignee: newAssignee })
  }

  const handleAssigneeEditorOpened = async (event: Event) => {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selected: employee?._id,
        allowDeselect: true,
        placeholder: tracker.string.AssignTo
      },
      event.target,
      handleAssigneeChanged
    )
  }
</script>

<Tooltip label={employee ? tracker.string.AssignedTo : tracker.string.AssignTo} props={{ value: formattedName }}>
  <div class="flex-presenter" on:click={handleAssigneeEditorOpened}>
    <div class="icon">
      <Avatar size={'x-small'} {avatar} />
    </div>
  </div>
</Tooltip>
