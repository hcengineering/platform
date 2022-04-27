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
  import { eventToHTMLElement, showPopup, Tooltip } from '@anticrm/ui'

  import tracker from '../../plugin'
  import { IntlString, translate } from '@anticrm/platform'
  import { onMount } from 'svelte'

  export let value: WithLookup<Issue>
  export let employees: (WithLookup<Employee> | undefined)[] = []
  export let currentSpace: Ref<Team> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let defaultName: IntlString | undefined = undefined

  const client = getClient()

  let defaultNameString: string = ''

  $: employee = (value?.$lookup?.assignee ?? employees.find(x => x?._id === value?.assignee)) as Employee | undefined
  $: avatar = employee?.avatar
  $: formattedName = employee?.name ? formatName(employee.name) : defaultNameString
  $: label = employee ? tracker.string.AssignedTo : tracker.string.AssignTo

  $: getDefaultNameString = async () => {
    if (!defaultName) {
      return
    }

    const result = await translate(defaultName, {})

    if (!result) {
      return
    }

    defaultNameString = result
  }

  onMount(() => {
    getDefaultNameString()
  })

  const handleAssigneeChanged = async (result: Employee | null | undefined) => {
    if (!isEditable || result === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: value._id })

    if (currentIssue === undefined) {
      return
    }

    const newAssignee = result === null ? null : result._id

    await client.update(currentIssue, { assignee: newAssignee })
  }

  const handleAssigneeEditorOpened = async (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selected: employee?._id,
        allowDeselect: true,
        placeholder: tracker.string.AssignTo
      },
      eventToHTMLElement(event),
      handleAssigneeChanged
    )
  }
</script>

{#if isEditable}
  <Tooltip {label} props={{ value: formattedName }}>
    <div class="flex-presenter" on:click={handleAssigneeEditorOpened}>
      <div class="icon">
        <Avatar size={'tiny'} {avatar} />
      </div>
      {#if shouldShowLabel}
        <div class="label nowrap ml-2">
          {formattedName}
        </div>
      {/if}
    </div>
  </Tooltip>
{:else}
  <div class="presenter">
    <div class="icon">
      <Avatar size={'tiny'} {avatar} />
    </div>
    {#if shouldShowLabel}
      <div class="label nowrap ml-2">
        {formattedName}
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
</style>
