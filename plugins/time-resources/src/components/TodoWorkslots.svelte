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
  import calendar, { Calendar, generateEventId } from '@hcengineering/calendar'
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { closePopup, showPopup } from '@hcengineering/ui'
  import { deleteObjects } from '@hcengineering/view-resources'
  import { TimeEvents, ToDo, WorkSlot } from '@hcengineering/time'
  import time from '../plugin'
  import Workslots from './Workslots.svelte'
  import { Analytics } from '@hcengineering/analytics'

  export let todo: ToDo

  const client = getClient()
  const query = createQuery()

  let slots: WorkSlot[] = []

  $: query.query(time.class.WorkSlot, { attachedTo: todo._id }, (res) => {
    slots = res
  })

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
    const currentUser = getCurrentAccount() as PersonAccount
    const extCalendar = await client.findOne(calendar.class.ExternalCalendar, {
      createdBy: currentUser._id,
      hidden: false,
      default: true
    })
    const _calendar = extCalendar ? extCalendar._id : (`${currentUser._id}_calendar` as Ref<Calendar>)
    const dueDate = date + defaultDuration
    await client.addCollection(time.class.WorkSlot, calendar.space.Calendar, todo._id, todo._class, 'workslots', {
      eventId: generateEventId(),
      date,
      dueDate,
      isExternal: false,
      calendar: _calendar,
      description: todo.description,
      participants: [currentUser.person],
      title: todo.title,
      allDay: false,
      access: 'owner',
      visibility: todo.visibility === 'public' ? 'public' : 'freeBusy',
      reminders: []
    })
    Analytics.handleEvent(TimeEvents.ToDoScheduled, { id: todo._id })
  }

  async function remove (e: CustomEvent<{ _id: Ref<WorkSlot> }>): Promise<void> {
    const object = slots.find((p) => p._id === e.detail._id)
    if (object) {
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

<Workslots {slots} fixed={'toDo'} on:change={change} on:dueChange={dueChange} on:create={create} on:remove={remove} />
