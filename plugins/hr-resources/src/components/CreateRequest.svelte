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
  import { AttachmentStyledBox } from '@anticrm/attachment-resources'
  import calendar from '@anticrm/calendar'
  import core, { generateId, Ref } from '@anticrm/core'
  import { Request, RequestType, Staff } from '@anticrm/hr'
  import { translate } from '@anticrm/platform'
  import { Card, createQuery, getClient } from '@anticrm/presentation'
  import ui, { Button, DateRangePresenter, DropdownLabelsIntl, IconAttachment } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'
  import { toUTC } from '../utils'

  export let staff: Staff
  export let date: Date
  let description: string = ''

  const objectId: Ref<Request> = generateId()
  let descriptionBox: AttachmentStyledBox

  const dispatch = createEventDispatcher()
  const client = getClient()
  const typesQuery = createQuery()

  let types: RequestType[] = []
  let type: RequestType | undefined = undefined
  let typeLabel = ''
  $: type && translate(type.label, {}).then((p) => (typeLabel = p))

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
    await client.createDoc(hr.class.Request, staff.department, {
      attachedTo: staff._id,
      attachedToClass: staff._class,
      type: type._id,
      date: toUTC(date),
      dueDate: toUTC(dueDate),
      description,
      collection: 'requests',
      timezoneOffset: new Date(date).getTimezoneOffset()
    })
    await descriptionBox.createAttachments()
  }

  function typeSelected (_id: Ref<RequestType>): void {
    type = types.find((p) => p._id === _id)
  }
</script>

<Card
  label={hr.string.CreateRequest}
  labelProps={{ type: typeLabel }}
  okAction={saveRequest}
  canSave={value !== undefined}
  on:close={() => {
    dispatch('close')
  }}
>
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
    <DateRangePresenter bind:value editable labelNull={ui.string.SelectDate} />
    <DateRangePresenter bind:value={dueDate} labelNull={calendar.string.DueTo} editable />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      kind={'transparent'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
</Card>
