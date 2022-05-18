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
  import { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { getClient, UserBox } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { Tooltip } from '@anticrm/ui'
  import contact from '@anticrm/contact'
  import tracker from '../../plugin'

  export let value: Issue

  const client = getClient()

  const handleAssigneeChanged = async (newAssignee: Ref<Employee> | undefined) => {
    if (newAssignee === undefined || value.assignee === newAssignee) {
      return
    }

    await client.update(value, { assignee: newAssignee })
  }
</script>

{#if value}
  <Tooltip label={tracker.string.AssignTo} fill>
    <UserBox
      _class={contact.class.Employee}
      label={tracker.string.Assignee}
      placeholder={tracker.string.Assignee}
      value={value.assignee}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      size="large"
      kind="link"
      width="100%"
      justify="left"
      on:change={({ detail }) => handleAssigneeChanged(detail)}
    />
  </Tooltip>
{/if}
