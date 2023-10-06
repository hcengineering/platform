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
  import { Employee, Person, PersonAccount } from '@hcengineering/contact'
  import { AssigneeBox, personAccountByIdStore } from '@hcengineering/contact-resources'
  import { AssigneeCategory } from '@hcengineering/contact-resources/src/assignee'
  import { Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, IconSize, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { getPreviousAssignees } from '../../utils'
  import { get } from 'svelte/store'

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

  const docQuery: DocumentQuery<Employee> = { active: true }

  const handleAssigneeChanged = async (newAssignee: Ref<Person> | undefined) => {
    if (newAssignee === undefined || object.assignee === newAssignee) {
      return
    }

    dispatch('change', newAssignee)

    if ('_class' in object) {
      await client.update(object, { assignee: newAssignee })
    }
  }

  let categories: AssigneeCategory[] = []

  function getCategories (object: Object): void {
    categories = []
    if ('_class' in object) {
      const _id = object._id
      categories.push({
        label: tracker.string.PreviousAssigned,
        func: async () => await getPreviousAssignees(_id)
      })
    }
    categories.push({
      label: tracker.string.ComponentLead,
      func: async () => {
        if (!object.component) {
          return []
        }
        const component = await client.findOne(tracker.class.Component, { _id: object.component })
        return component?.lead ? [component.lead] : []
      }
    })
    categories.push({
      label: tracker.string.Members,
      func: async () => {
        if (!object.space) {
          return []
        }
        const project = await client.findOne(tracker.class.Project, { _id: object.space })
        if (project === undefined) {
          return []
        }
        const store = get(personAccountByIdStore)
        const accounts = project.members
          .map((p) => store.get(p as Ref<PersonAccount>))
          .filter((p) => p !== undefined) as PersonAccount[]
        return accounts.map((p) => p.person as Ref<Employee>)
      }
    })
  }

  $: getCategories(object)
</script>

{#if object}
  <AssigneeBox
    {docQuery}
    {focusIndex}
    label={tracker.string.Assignee}
    placeholder={tracker.string.Assignee}
    value={object.assignee}
    {categories}
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
