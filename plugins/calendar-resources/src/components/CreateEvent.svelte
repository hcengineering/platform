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
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Card, getClient, UserBoxList } from '@hcengineering/presentation'
  import ui, { EditBox, DateRangePresenter } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let attachedTo: Ref<Doc> = calendar.ids.NoAttached
  export let attachedToClass: Ref<Class<Doc>> = calendar.class.Event
  export let title: string = ''
  export let date: Date | undefined = undefined
  export let withTime = false

  const now = new Date()

  let value =
    date === undefined ? now.getTime() : withTime ? date.getTime() : date.setHours(now.getHours(), now.getMinutes())
  let dueDate = value + 30 * 60 * 1000
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
    if (value != null) date = value
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
</script>

<Card
  label={calendar.string.CreateEvent}
  okAction={saveEvent}
  canSave={title !== undefined && title.trim().length > 0 && participants.length > 0 && value !== undefined}
  on:close={() => {
    dispatch('close')
  }}
>
  <EditBox bind:value={title} placeholder={calendar.string.Title} maxWidth={'37.5rem'} kind={'large-style'} focus />
  <svelte:fragment slot="pool">
    <DateRangePresenter bind:value withTime editable labelNull={ui.string.SelectDate} />
    <DateRangePresenter bind:value={dueDate} labelNull={calendar.string.DueTo} withTime editable />
    <UserBoxList bind:items={participants} label={calendar.string.Participants} />
  </svelte:fragment>
</Card>
