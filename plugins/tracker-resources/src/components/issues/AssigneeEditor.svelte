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
  import { Employee, PersonAccount, Person } from '@hcengineering/contact'
  import { AssigneeBox, personAccountByIdStore } from '@hcengineering/contact-resources'
  import { Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, IconSize, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { getPreviousAssignees } from '../../utils'

  type Object = (Doc | {}) & Pick<Issue, 'space' | 'component' | 'assignee'>

  export let object: Object
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let avatarSize: IconSize = 'card'
  export let tooltipAlignment: TooltipAlignment | undefined = undefined
  export let width: string = 'min-content'
  export let focusIndex: number | undefined = undefined
  export let short: boolean = false
  export let shouldShowName = true
  export let shrink: number = 0

  const client = getClient()
  const dispatch = createEventDispatcher()
  const projectQuery = createQuery()

  let project: Project | undefined
  let prevAssigned: Ref<Person>[] = []
  let componentLead: Ref<Employee> | undefined = undefined
  let members: Ref<Employee>[] = []
  let docQuery: DocumentQuery<Employee> = {}

  $: '_class' in object &&
    getPreviousAssignees(object._id).then((res) => {
      prevAssigned = res
    })

  async function updateComponentMembers (project: Project, issue: Object) {
    if (issue.component) {
      const component = await client.findOne(tracker.class.Component, { _id: issue.component })
      componentLead = component?.lead || undefined
    } else {
      componentLead = undefined
    }
    if (project !== undefined) {
      const accounts = project.members
        .map((p) => $personAccountByIdStore.get(p as Ref<PersonAccount>))
        .filter((p) => p !== undefined) as PersonAccount[]
      members = accounts.map((p) => p.person as Ref<Employee>)
    } else {
      members = []
    }

    docQuery = project?.private ? { _id: { $in: members } } : { active: true }
  }

  const handleAssigneeChanged = async (newAssignee: Ref<Person> | undefined) => {
    if (newAssignee === undefined || object.assignee === newAssignee) {
      return
    }

    dispatch('change', newAssignee)

    if ('_class' in object) {
      await client.update(object, { assignee: newAssignee })
    }
  }

  $: projectQuery.query(tracker.class.Project, { _id: object.space }, (res) => ([project] = res))
  $: project && updateComponentMembers(project, object)
  $: docQuery = project?.private ? { _id: { $in: members } } : {}
</script>

{#if object}
  <AssigneeBox
    {docQuery}
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
    {shrink}
    {shouldShowName}
    showNavigate={false}
    justify={'left'}
    showTooltip={{
      label: tracker.string.AssignTo,
      personLabel: tracker.string.AssignedTo,
      placeholderLabel: tracker.string.Unassigned,
      direction: tooltipAlignment
    }}
    on:change={({ detail }) => handleAssigneeChanged(detail)}
  />
{/if}
