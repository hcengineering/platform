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
  import contact, { Employee, Person, PersonAccount } from '@hcengineering/contact'
  import { AssigneeBox, AssigneePopup, personAccountByIdStore } from '@hcengineering/contact-resources'
  import { AssigneeCategory } from '@hcengineering/contact-resources/src/assignee'
  import { Account, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Component, Issue } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, IconSize, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { get } from 'svelte/store'
  import tracker from '../../plugin'
  import { getPreviousAssignees } from '../../utils'

  type Object = (Doc | {}) & Pick<Issue, 'space' | 'component' | 'assignee'>

  export let object: Object | Object[] | undefined = undefined
  export let value: Object | Object[] | undefined = undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let avatarSize: IconSize = 'card'
  export let tooltipAlignment: TooltipAlignment | undefined = undefined
  export let width: string = 'min-content'
  export let focusIndex: number | undefined = undefined
  export let short: boolean = false
  export let shouldShowName = true
  export let shrink: number = 0
  export let isAction: boolean = false

  $: _object =
    (typeof object !== 'string' ? object : undefined) ?? (typeof value !== 'string' ? value : undefined) ?? []

  const client = getClient()
  const dispatch = createEventDispatcher()

  const docQuery: DocumentQuery<Employee> = { active: true }

  const handleAssigneeChanged = async (newAssignee: Ref<Person> | undefined | null) => {
    if (newAssignee === undefined || (!Array.isArray(_object) && _object?.assignee === newAssignee)) {
      return
    }

    if (Array.isArray(_object)) {
      await Promise.all(
        _object.map(async (p) => {
          if ('_class' in p) {
            await client.update(p, { assignee: newAssignee })
          }
        })
      )
    } else {
      if ('_class' in _object) {
        await client.update(_object as any, { assignee: newAssignee })
      }
    }

    dispatch('change', newAssignee)
    if (isAction) dispatch('close')
  }

  let categories: AssigneeCategory[] = []

  function getCategories (object: Object | Object[]): void {
    categories = []
    const docs = Array.isArray(object) ? object : [object]
    const cdocs = docs.filter((d) => '_class' in d) as Doc[]
    if (cdocs.length > 0) {
      categories.push({
        label: tracker.string.PreviousAssigned,
        func: async () => {
          const r: Ref<Person>[] = []
          for (const d of cdocs) {
            r.push(...(await getPreviousAssignees(d._id)))
          }
          return r
        }
      })
    }
    categories.push({
      label: tracker.string.ComponentLead,
      func: async () => {
        const components = Array.from(docs.map((it) => it.component).filter((it) => it)) as Ref<Component>[]
        if (components.length === 0) {
          return []
        }
        const component = await client.findAll(tracker.class.Component, { _id: { $in: components } })
        return component.map((it) => it.lead).filter((it) => it) as Ref<Person>[]
      }
    })
    categories.push({
      label: tracker.string.Members,
      func: async () => {
        const spaces = Array.from(docs.map((it) => it.space).filter((it) => it)) as Ref<Space>[]
        if (spaces.length === 0) {
          return []
        }
        const projects = await client.findAll(tracker.class.Project, {
          _id: !Array.isArray(object) ? object.space : { $in: Array.from(object.map((it) => it.space)) }
        })
        if (projects === undefined) {
          return []
        }
        const store = get(personAccountByIdStore)
        const allMembers = projects.reduce((arr, p) => arr.concat(p.members), [] as Ref<Account>[])
        const accounts = allMembers
          .map((p) => store.get(p as Ref<PersonAccount>))
          .filter((p) => p !== undefined) as PersonAccount[]
        return accounts.map((p) => p.person as Ref<Employee>)
      }
    })
  }

  $: getCategories(_object)

  $: sel =
    (!Array.isArray(_object)
      ? _object.assignee
      : _object.reduce((v, it) => (v != null && v === it.assignee ? it.assignee : null), _object[0]?.assignee) ??
        undefined) ?? undefined
</script>

{#if _object}
  {#if isAction}
    <AssigneePopup
      {docQuery}
      {categories}
      icon={contact.icon.Person}
      selected={sel}
      allowDeselect={true}
      titleDeselect={undefined}
      on:close={(evt) => {
        const result = evt.detail
        if (result === null) {
          handleAssigneeChanged(null)
        } else if (result !== undefined && result._id !== value) {
          value = result._id
          handleAssigneeChanged(result._id)
        }
      }}
    />
  {:else}
    <AssigneeBox
      {docQuery}
      {focusIndex}
      label={tracker.string.Assignee}
      placeholder={tracker.string.Assignee}
      value={sel}
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
{/if}
