<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import calendar, { AccessLevel, generateEventId } from '@hcengineering/calendar'
  import { EventReminders } from '@hcengineering/calendar-resources'
  import contact, { getCurrentEmployee } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { closePopup, showPopup } from '@hcengineering/ui'
  import { deleteObjects } from '@hcengineering/view-resources'
  import { TimeEvents, ToDo, WorkSlot } from '@hcengineering/time'
  import time from '../plugin'
  import Workslots from './Workslots.svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { findPrimaryCalendar } from '../utils'

  export let todo: ToDo

  const client = getClient()
  const query = createQuery()

  let slots: WorkSlot[] = []
  let reminders: number[] = []
  let remindersHydrated = false
  let remindersKey = ''
  let currentTodoId: Ref<ToDo> | undefined

  $: if (todo?._id !== undefined && currentTodoId !== todo._id) {
    currentTodoId = todo._id
    remindersHydrated = false
    reminders = []
    remindersKey = ''
  }

  $: query.query(time.class.WorkSlot, { attachedTo: todo._id }, (res) => {
    slots = res
    if (!remindersHydrated) {
      reminders = [...(slots[0]?.reminders ?? [])]
      remindersHydrated = true
      remindersKey = JSON.stringify(reminders)
    }
  })

  $: {
    if (!remindersHydrated || slots.length === 0) {
      // no-op
    } else {
      const nextKey = JSON.stringify(reminders)
      if (nextKey !== remindersKey) {
        remindersKey = nextKey
        void syncRemindersForSlots()
      }
    }
  }

  async function change (e: CustomEvent<{ startDate: number, dueDate: number, slot: Ref<WorkSlot> }>): Promise<void> {
    const { startDate, dueDate, slot } = e.detail
    const workslot = slots.find((s) => s._id === slot)
    if (workslot !== undefined) {
      await client.update(workslot, { date: startDate, dueDate })
    }
  }

  async function dueChange (e: CustomEvent<{ dueDate: number, slot: Ref<WorkSlot> }>): Promise<void> {
    const { dueDate, slot } = e.detail
    const workslot = slots.find((s) => s._id === slot)
    if (workslot !== undefined) {
      await client.update(workslot, { dueDate })
    }
  }

  async function create (): Promise<void> {
    const defaultDuration = 30 * 60 * 1000
    const now = Date.now()
    const date = Math.ceil(now / (30 * 60 * 1000)) * (30 * 60 * 1000)
    const currentAccount = getCurrentAccount()
    const _calendar = await findPrimaryCalendar()
    const dueDate = date + defaultDuration
    await client.addCollection(time.class.WorkSlot, calendar.space.Calendar, todo._id, todo._class, 'workslots', {
      eventId: generateEventId(),
      date,
      dueDate,
      calendar: _calendar,
      description: todo.description,
      participants: [getCurrentEmployee()],
      title: todo.title,
      blockTime: true,
      allDay: false,
      access: AccessLevel.Owner,
      user: currentAccount.primarySocialId,
      visibility: todo.visibility === 'public' ? 'public' : 'freeBusy',
      reminders
    })
    Analytics.handleEvent(TimeEvents.ToDoScheduled, { id: todo._id })
  }

  async function syncRemindersForSlots (): Promise<void> {
    await Promise.all(
      slots.map(async (slot) => {
        await client.update(slot, { reminders })
      })
    )
  }

  async function remove (e: CustomEvent<{ _id: Ref<WorkSlot> }>): Promise<void> {
    const object = slots.find((p) => p._id === e.detail._id)
    if (object !== undefined) {
      showPopup(
        contact.component.DeleteConfirmationPopup,
        {
          object,
          deleteAction: async () => {
            const objs = Array.isArray(object) ? object : [object]
            await deleteObjects(getClient(), objs).catch((err) => {
              console.error(err)
            })
            closePopup()
          }
        },
        undefined
      )
    }
  }
</script>

<div class="flex-col">
  <Workslots {slots} fixed={'toDo'} on:change={change} on:dueChange={dueChange} on:create={create} on:remove={remove} />
  {#if slots.length > 0}
    <div class="flex pt-4">
      <EventReminders bind:reminders />
    </div>
  {/if}
</div>
