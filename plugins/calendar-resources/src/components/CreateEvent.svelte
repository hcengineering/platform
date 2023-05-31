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
  import { Employee, EmployeeAccount } from '@hcengineering/contact'
  import { Class, DateRangeMode, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import ui, { EditBox, DateRangePresenter } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let attachedTo: Ref<Doc> = calendar.ids.NoAttached
  export let attachedToClass: Ref<Class<Doc>> = calendar.class.Event
  export let title: string = ''
  export let date: Date | undefined = undefined
  export let withTime = false

  const now = new Date()
  const defaultDuration = 30 * 60 * 1000

  let startDate =
    date === undefined ? now.getTime() : withTime ? date.getTime() : date.setHours(now.getHours(), now.getMinutes())
  let duration = defaultDuration
  let dueDate = startDate + duration
  let dueDateRef: DateRangePresenter

  const currentUser = getCurrentAccount() as EmployeeAccount
  let participants: Ref<Employee>[] = [currentUser.employee]
  const space = calendar.space.PersonalEvents

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return title !== undefined && title.trim().length === 0 && participants.length === 0
  }

  async function saveEvent () {
    let date: number | undefined
    if (startDate != null) date = startDate
    if (date === undefined) return
    await client.createDoc(calendar.class.Event, space, {
      attachedTo,
      attachedToClass,
      collection: 'events',
      date,
      dueDate,
      description: '',
      participants,
      title
    })
  }

  const handleNewStartDate = async (newStartDate: number | null) => {
    if (newStartDate !== null) {
      startDate = newStartDate
      dueDate = startDate + duration
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
        dueDate = startDate + duration
      }
      await tick()
      dueDateRef.adaptValue()
    }
  }
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
    <DateRangePresenter
      value={startDate}
      labelNull={ui.string.SelectDate}
      on:change={async (event) => await handleNewStartDate(event.detail)}
      mode={DateRangeMode.DATETIME}
      kind={'secondary'}
      size={'large'}
      editable
    />
    <DateRangePresenter
      bind:this={dueDateRef}
      value={dueDate}
      labelNull={calendar.string.DueTo}
      on:change={async (event) => await handleNewDueDate(event.detail)}
      mode={DateRangeMode.DATETIME}
      kind={'secondary'}
      size={'large'}
      editable
    />
    <UserBoxList bind:items={participants} label={calendar.string.Participants} kind={'secondary'} size={'large'} />
  </svelte:fragment>
</Card>
