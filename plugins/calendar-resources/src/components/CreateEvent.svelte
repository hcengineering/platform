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
  import { Calendar, generateEventId } from '@hcengineering/calendar'
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import { Class, DateRangeMode, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import ui, { DateRangePresenter, EditBox, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher, tick } from 'svelte'
  import calendar from '../plugin'

  export let attachedTo: Ref<Doc> = calendar.ids.NoAttached
  export let attachedToClass: Ref<Class<Doc>> = calendar.class.Event
  export let title: string = ''
  export let date: Date | undefined = undefined
  export let withTime = false

  const now = new Date()
  const defaultDuration = 30 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000

  let startDate =
    date === undefined ? now.getTime() : withTime ? date.getTime() : date.setHours(now.getHours(), now.getMinutes())
  let duration = defaultDuration
  let dueDate = startDate + duration
  let dueDateRef: DateRangePresenter
  let allDay = false

  const currentUser = getCurrentAccount() as EmployeeAccount
  let participants: Ref<Employee>[] = [currentUser.employee]

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return title !== undefined && title.trim().length === 0 && participants.length === 0
  }

  async function saveEvent () {
    let date: number | undefined
    if (startDate != null) date = startDate
    if (date === undefined) return
    const space = `${getCurrentAccount()._id}_calendar` as Ref<Calendar>
    await client.addCollection(calendar.class.Event, space, attachedTo, attachedToClass, 'events', {
      eventId: generateEventId(),
      date: allDay ? new Date(date).setUTCHours(0, 0, 0, 0) : date,
      dueDate: allDay ? new Date(dueDate).setUTCHours(0, 0, 0, 0) : dueDate,
      description: '',
      participants,
      title,
      allDay,
      access: 'owner'
    })
  }

  const handleNewStartDate = async (newStartDate: number | null) => {
    if (newStartDate !== null) {
      startDate = newStartDate
      dueDate = startDate + (allDay ? allDayDuration : duration)
      await tick()
      dueDateRef.adaptValue()
    }
  }

  const handleNewDueDate = async (newDueDate: number | null) => {
    if (newDueDate !== null) {
      const diff = newDueDate - startDate
      if (diff > 0) {
        dueDate = newDueDate
        duration = diff
      } else {
        dueDate = startDate + (allDay ? allDayDuration : duration)
      }
      await tick()
      dueDateRef.adaptValue()
    }
  }

  async function allDayChangeHandler () {
    if (allDay) {
      startDate = new Date(startDate).setUTCHours(0, 0, 0, 0)
      if (dueDate - startDate < allDayDuration) {
        dueDate = allDayDuration + startDate
      }
      dueDate = new Date(dueDate).setUTCHours(0, 0, 0, 0)
    } else {
      dueDate = startDate + defaultDuration
    }
    await tick()
    dueDateRef.adaptValue()
  }

  $: mode = allDay ? DateRangeMode.DATE : DateRangeMode.DATETIME
</script>

<Card
  label={calendar.string.CreateEvent}
  okAction={saveEvent}
  canSave={title !== undefined && title.trim().length > 0 && participants.length > 0 && startDate !== undefined}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <EditBox bind:value={title} placeholder={calendar.string.Title} kind={'large-style'} autoFocus />
  <svelte:fragment slot="pool">
    <ToggleWithLabel bind:on={allDay} label={calendar.string.AllDay} on:change={allDayChangeHandler} />
    <DateRangePresenter
      value={startDate}
      labelNull={ui.string.SelectDate}
      on:change={async (event) => await handleNewStartDate(event.detail)}
      kind={'regular'}
      {mode}
      size={'large'}
      editable
    />
    <DateRangePresenter
      bind:this={dueDateRef}
      value={dueDate}
      labelNull={calendar.string.DueTo}
      on:change={async (event) => await handleNewDueDate(event.detail)}
      kind={'regular'}
      {mode}
      size={'large'}
      editable
    />
    <UserBoxList bind:items={participants} label={calendar.string.Participants} kind={'regular'} size={'large'} />
  </svelte:fragment>
</Card>
