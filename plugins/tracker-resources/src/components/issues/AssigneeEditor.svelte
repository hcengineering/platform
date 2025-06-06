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
  import contact, { Employee, Person } from '@hcengineering/contact'
  import { AssigneeBox, AssigneePopup, personRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import { AssigneeCategory } from '@hcengineering/contact-resources/src/assignee'
  import { Doc, DocumentQuery, notEmpty, Ref, Space } from '@hcengineering/core'
  import { RuleApplyResult, getClient, getDocRules } from '@hcengineering/presentation'
  import { Component, Issue, TrackerEvents } from '@hcengineering/tracker'
  import { ButtonKind, ButtonSize, IconSize, TooltipAlignment } from '@hcengineering/ui'
  import { Analytics } from '@hcengineering/analytics'
  import { createEventDispatcher } from 'svelte'

  import tracker from '../../plugin'
  import { getPreviousAssignees } from '../../utils'

  type AssigneeObject = (Doc | any) & Pick<Issue, 'space' | 'component' | 'assignee' | 'identifier'>

  export let object: AssigneeObject | AssigneeObject[] | undefined = undefined
  export let value: AssigneeObject | AssigneeObject[] | undefined = undefined
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
  export let readonly: boolean = false
  export let showStatus = true

  $: _object =
    (typeof object !== 'string' ? object : undefined) ?? (typeof value !== 'string' ? value : undefined) ?? []

  $: docs = Array.isArray(_object) ? _object : [_object]
  $: cdocs = docs.filter((d) => '_class' in d) as Doc[]

  const client = getClient()
  const dispatch = createEventDispatcher()
  let progress = false

  const handleAssigneeChanged = async (newAssignee: Ref<Person> | undefined | null) => {
    if (newAssignee === undefined || (!Array.isArray(_object) && _object?.assignee === newAssignee)) {
      return
    }
    progress = true
    const ops = client.apply()
    if (Array.isArray(_object)) {
      for (const p of _object) {
        if ('_class' in p) {
          Analytics.handleEvent(TrackerEvents.IssueSetAssignee, { issue: p.identifier ?? p._id })
          await ops.update(p, { assignee: newAssignee })
        }
      }
    } else {
      if ('_class' in _object) {
        Analytics.handleEvent(TrackerEvents.IssueSetAssignee, { issue: _object.identifier ?? _object._id })
        await ops.update(_object, { assignee: newAssignee })
      }
    }

    await ops.commit()

    progress = false

    dispatch('change', newAssignee)
    if (isAction) dispatch('close')
  }

  let categories: AssigneeCategory[] = []

  function getCategories (object: AssigneeObject | AssigneeObject[]): void {
    categories = []
    if (cdocs.length > 0) {
      categories.push({
        label: tracker.string.PreviousAssigned,
        func: async () => {
          const r: Ref<Person>[] = []
          for (const d of cdocs) {
            r.push(...(await getPreviousAssignees(d._id as Ref<Issue>)))
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

        const allMembers = projects.map((p) => p.members).flat()
        const allPersonsSet = new Set(allMembers.map((p) => $personRefByAccountUuidStore.get(p)).filter(notEmpty))

        return Array.from(allPersonsSet)
      }
    })
  }

  $: getCategories(_object)

  $: sel =
    (!Array.isArray(_object)
      ? _object.assignee
      : _object.reduce((v, it) => (v != null && v === it.assignee ? it.assignee : null), _object[0]?.assignee) ??
        undefined) ?? undefined

  let rulesQuery: RuleApplyResult<Employee> | undefined
  let query: DocumentQuery<Employee>
  $: if (cdocs.length > 0) {
    rulesQuery = getDocRules<Employee>(cdocs, 'assignee')
    if (rulesQuery !== undefined) {
      query = { ...(rulesQuery?.fieldQuery ?? {}), active: true }
    } else {
      query = { _id: 'none' as Ref<Employee>, active: true }
      rulesQuery = {
        disableEdit: true,
        disableUnset: true,
        fieldQuery: {}
      }
    }
  }
</script>

{#if _object}
  {#if isAction}
    <AssigneePopup
      docQuery={query}
      {categories}
      icon={contact.icon.Person}
      selected={sel}
      allowDeselect={true}
      titleDeselect={undefined}
      loading={progress}
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
      docQuery={query}
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
      {readonly}
      {shouldShowName}
      {showStatus}
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
