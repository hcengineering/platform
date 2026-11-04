<!--
// Copyright © 2026 TraceX SAS.
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
  import core, { AccountUuid, AnyAttribute, DocumentQuery, notEmpty, Ref, Space } from '@hcengineering/core'
  import { ButtonKind, IconSize } from '@hcengineering/ui'
  import { employeeRefByAccountUuidStore, PersonLabelTooltip } from '..'
  import contact from '../plugin'
  import { employeeByIdStore } from '../utils'
  import AssigneeBox from './AssigneeBox.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'
  import { getClient } from '@hcengineering/presentation'

  export let value: Ref<Employee> | null | undefined
  export let kind: ButtonKind = 'link'
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let onChange: ((value: Ref<Employee>) => void) | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false
  export let shouldShowName: boolean = true
  export let avatarSize: IconSize = kind === 'list-header' ? 'smaller' : 'x-small'
  export let readonly = false
  export let attribute: AnyAttribute | undefined = undefined
  export let space: Ref<Space> | undefined = undefined

  $: employee = value ? $employeeByIdStore.get(value) : undefined

  function getValue (
    employee: Employee | undefined,
    value: Ref<Employee> | null | undefined
  ): Employee | null | undefined {
    if (value === undefined || value === null) {
      return value
    }
    return employee
  }

  let query: DocumentQuery<Employee> = {
    active: true
  }

  const client = getClient()

  $: buildQuery(attribute, space)

  async function buildQuery (attribute: AnyAttribute | undefined, space: Ref<Space> | undefined): Promise<void> {
    const baseQuery = {
      active: true
    }
    if (attribute === undefined || space === undefined) {
      query = baseQuery
      return
    }
    if (attribute.spaceMembersOnly === true || attribute.byRole !== undefined) {
      const _space = await client.findOne(core.class.Space, {
        _id: space
      })
      if (_space === undefined) {
        query = baseQuery
        return
      }

      if (attribute.byRole === undefined) {
        const allMembers = _space.members ?? []
        const allPersonsSet = new Set(allMembers.map((p) => $employeeRefByAccountUuidStore.get(p)).filter(notEmpty))

        query = {
          ...baseQuery,
          _id: { $in: Array.from(allPersonsSet) }
        }
      } else {
        const asMixin = client.getHierarchy().as(_space, core.mixin.SpacesTypeData)
        const roleMembers = ((asMixin as any)[attribute.byRole] ?? []) as AccountUuid[]
        const rolePersons = new Set(roleMembers.map((p) => $employeeRefByAccountUuidStore.get(p)).filter(notEmpty))
        query = {
          ...baseQuery,
          _id: { $in: Array.from(rolePersons) }
        }
      }
    }
  }
</script>

{#if onChange !== undefined}
  <AssigneeBox
    label={contact.string.Employee}
    {readonly}
    {value}
    docQuery={query}
    on:change={({ detail }) => onChange?.(detail)}
  >
    <EmployeePresenter
      slot="content"
      value={getValue(employee, value)}
      {inline}
      {tooltipLabels}
      disabled
      shouldShowAvatar
      shouldShowPlaceholder
      defaultName={contact.string.NotSpecified}
      shouldShowName={shouldShowName ? kind !== 'list' : false}
      {avatarSize}
      {colorInherit}
      {accent}
      on:accent-color
    />
  </AssigneeBox>
{:else}
  <EmployeePresenter
    value={getValue(employee, value)}
    {inline}
    {tooltipLabels}
    disabled
    shouldShowAvatar
    shouldShowPlaceholder
    defaultName={contact.string.NotSpecified}
    shouldShowName={shouldShowName ? kind !== 'list' : false}
    {avatarSize}
    {colorInherit}
    {accent}
    on:accent-color
  />
{/if}
