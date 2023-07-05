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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import calendar from '@hcengineering/calendar'
  import { Employee } from '@hcengineering/contact'
  import core, { DocumentQuery, generateId, Ref } from '@hcengineering/core'
  import { Request, RequestType, Staff, toTzDate } from '@hcengineering/hr'
  import { translate } from '@hcengineering/platform'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { EmployeeBox } from '@hcengineering/contact-resources'
  import ui, {
    Button,
    DateRangePresenter,
    DropdownLabelsIntl,
    IconAttachment,
    Label,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'
  import { getRequests } from '../utils'

  export let staff: Staff
  export let date: Date
  export let readonly: boolean
  export let docQuery: DocumentQuery<Employee> | undefined
  export let employeeRequests: Map<Ref<Staff>, Request[]>

  let description: string = ''
  let employee: Ref<Employee> = staff._id

  const objectId: Ref<Request> = generateId()
  let descriptionBox: AttachmentStyledBox

  const dispatch = createEventDispatcher()
  const client = getClient()
  const typesQuery = createQuery()

  let types: RequestType[] = []
  let type: RequestType | undefined = undefined
  let typeLabel = ''
  $: type && translate(type.label, {}, $themeStore.language).then((p) => (typeLabel = p))

  typesQuery.query(hr.class.RequestType, {}, (res) => {
    types = res
    if (type === undefined) {
      type = types[0]
    }
  })

  let value = new Date(date).getTime()
  $: dueDate = new Date(value).getTime()

  export function canClose (): boolean {
    return description.length === 0
  }

  async function saveRequest () {
    let date: number | undefined
    if (value != null) date = value
    if (date === undefined) return
    if (type === undefined) return
    if (employee === null) return
    await client.addCollection(hr.class.Request, staff.department, employee, staff._class, 'requests', {
      type: type._id,
      tzDate: toTzDate(new Date(date)),
      tzDueDate: toTzDate(new Date(dueDate)),
      description
    })
    await descriptionBox.createAttachments()
  }

  function typeSelected (_id: Ref<RequestType>): void {
    type = types.find((p) => p._id === _id)
  }

  function moreThanLimit (
    employeeRequests: Map<Ref<Staff>, Request[]>,
    staff: Staff,
    startDate: Date,
    endDate: Date,
    type: RequestType | undefined
  ): boolean {
    if (employeeRequests === undefined) return true
    if (type === undefined) return true
    const requests = getRequests(employeeRequests, startDate, endDate, staff._id)
    return requests.length > 0
  }
  $: notLimit = moreThanLimit(
    employeeRequests,
    staff,
    new Date(value),
    new Date(new Date(dueDate).setHours(23, 59, 59, 999)),
    type
  )
</script>

<Card
  label={hr.string.CreateRequest}
  labelProps={{ type: typeLabel }}
  okAction={saveRequest}
  canSave={value !== undefined && !notLimit}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <EmployeeBox
      label={hr.string.SelectEmployee}
      placeholder={hr.string.SelectEmployee}
      kind={'regular'}
      size={'large'}
      bind:value={employee}
      {readonly}
      showNavigate={false}
      {docQuery}
    />
  </svelte:fragment>
  <DropdownLabelsIntl
    items={types.map((p) => {
      return { id: p._id, label: p.label }
    })}
    label={hr.string.RequestType}
    on:selected={(e) => typeSelected(e.detail)}
  />
  <AttachmentStyledBox
    bind:this={descriptionBox}
    {objectId}
    _class={hr.class.Request}
    space={staff.department}
    alwaysEdit
    showButtons={false}
    maxHeight={'card'}
    bind:content={description}
    placeholder={core.string.Description}
  />
  <svelte:fragment slot="pool">
    <DateRangePresenter bind:value editable labelNull={ui.string.SelectDate} kind={'regular'} size={'large'} />
    <DateRangePresenter
      bind:value={dueDate}
      labelNull={calendar.string.DueTo}
      editable
      kind={'regular'}
      size={'large'}
    />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      size={'large'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="error">
    {#if notLimit}
      <Label label={hr.string.ExistingRequests} />
    {/if}
  </svelte:fragment>
</Card>
