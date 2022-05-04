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
  import { Event } from '@anticrm/calendar'
  import contact, { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import presentation, { Card, getClient, UserBoxList } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { DatePicker, Grid, StylishEdit } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let value: Event

  let title: string = value.title
  let description: string = value.description
  let startDate: number = value.date
  let participants: Ref<Employee>[] = value.participants ?? []
  const space = calendar.space.PersonalEvents

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return title.trim().length === 0 && participants.length === 0
  }

  async function saveReminder () {
    await client.updateDoc(value._class, value.space, value._id, {
      date: startDate,
      description,
      participants,
      title
    })

    await client.updateMixin(value._id, value._class, space, calendar.mixin.Reminder, {
      shift: 0,
      state: 'active'
    })
  }
</script>

<Card
  label={calendar.string.EditReminder}
  okAction={saveReminder}
  okLabel={presentation.string.Save}
  canSave={title.trim().length > 0 && startDate > 0 && participants.length > 0}
  {space}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.75}>
    <StylishEdit bind:value={title} label={calendar.string.Title} />
    <StyledTextBox
      emphasized
      showButtons={false}
      alwaysEdit
      bind:content={description}
      label={calendar.string.Description}
      placeholder={calendar.string.Description}
    />
    <div class="antiComponentBox">
      <DatePicker title={calendar.string.Date} bind:value={startDate} withTime />
    </div>
    <UserBoxList
      _class={contact.class.Employee}
      items={participants}
      label={calendar.string.Participants}
      on:open={(evt) => {
        participants.push(evt.detail._id)
        participants = participants
      }}
      on:delete={(evt) => {
        const _id = evt.detail._id
        const index = participants.findIndex((p) => p === _id)
        if (index !== -1) {
          participants.splice(index, 1)
          participants = participants
        }
      }}
    />
  </Grid>
</Card>
