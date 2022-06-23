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
  import core, { Class, generateId, Ref } from '@anticrm/core'
  import { Request, Staff } from '@anticrm/hr'
  import { translate } from '@anticrm/platform'
  import { Card, getClient } from '@anticrm/presentation'
  import ui, { Button, DateRangePresenter, DropdownLabelsIntl, IconAttachment } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../plugin'

  export let staff: Staff
  export let date: Date
  let description: string = ''

  const objectId: Ref<Request> = generateId()
  let descriptionBox: AttachmentStyledBox

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const types: Class<Request>[] = hierarchy
    .getDescendants(hr.class.Request)
    .filter((p) => p !== hr.class.Request)
    .map((p) => hierarchy.getClass(p))
    .filter((p) => p.label !== undefined)
  let type: Ref<Class<Request>> = types[0]._id
  let typeLabel = ''
  $: translate(hierarchy.getClass(type).label, {}).then((p) => (typeLabel = p))

  $: half = [hr.class.Overtime2, hr.class.PTO2].includes(type)
  $: value = new Date(date).getTime()
  $: dueDate = half
    ? new Date(value).setHours(new Date(value).getHours() + 12)
    : new Date(value).setDate(new Date(value).getDate() + 1)

  export function canClose (): boolean {
    return description.length === 0
  }

  async function saveRequest () {
    let date: number | undefined
    if (value != null) date = value
    if (date === undefined) return
    await client.createDoc(type, staff.department, {
      attachedTo: staff._id,
      attachedToClass: staff._class,
      date: date,
      dueDate: half ? new Date(dueDate).setHours(12, 0, 0, 0) : dueDate,
      description,
      collection: 'requests'
    })
    await descriptionBox.createAttachments()
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
    placeholder={hr.string.RequestType}
    label={hr.string.RequestType}
    bind:selected={type}
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
