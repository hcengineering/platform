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
  import { Calendar, Event, generateEventId } from '@hcengineering/calendar'
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import { Class, DateRangeMode, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import ui, { DateRangePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>
  export let event: Event | undefined = undefined
  export let title: string = ''
  let _title = title

  let value: number | null | undefined = null
  const currentUser = getCurrentAccount() as PersonAccount
  let participants: Ref<Employee>[] = [currentUser.person as Ref<Employee>]
  const defaultDuration = 30 * 60 * 1000

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return _title !== undefined && _title.trim().length === 0 && participants.length === 0
  }

  async function saveReminder () {
    let date: number | undefined
    if (value != null) date = value
    if (date === undefined) return
    const space = `${getCurrentAccount()._id}_calendar` as Ref<Calendar>
    await client.addCollection(calendar.class.Event, space, attachedTo, attachedToClass, 'events', {
      eventId: generateEventId(),
      date,
      dueDate: date + defaultDuration,
      description: '',
      participants,
      title: _title,
      allDay: false,
      reminders: [0],
      access: 'owner'
    })
  }
</script>

<Card
  label={calendar.string.CreateReminder}
  okAction={saveReminder}
  canSave={_title !== undefined && _title.trim().length > 0 && participants.length > 0 && value !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <EditBox bind:value={_title} placeholder={calendar.string.Title} kind={'large-style'} autoFocus />
  <svelte:fragment slot="pool">
    <DateRangePresenter
      bind:value
      mode={DateRangeMode.DATETIME}
      editable={true}
      labelNull={ui.string.SelectDate}
      kind={'regular'}
      size={'large'}
    />
    <UserBoxList bind:items={participants} label={calendar.string.Participants} kind={'regular'} size={'large'} />
  </svelte:fragment>
</Card>
