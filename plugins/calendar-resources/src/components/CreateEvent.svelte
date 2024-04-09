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
  import { Calendar, RecurringRule, Visibility, generateEventId } from '@hcengineering/calendar'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getUserTimezone } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { saveUTC } from '../utils'
  import EventManager from './EventManager.svelte'

  export let attachedTo: Ref<Doc> = calendar.ids.NoAttached
  export let attachedToClass: Ref<Class<Doc>> = calendar.class.Event
  export let title: string = ''
  export let date: Date | undefined = undefined
  export let withTime = false

  const now = new Date()
  const defaultDuration = 60 * 60 * 1000

  let startDate =
    date === undefined ? now.getTime() : withTime ? date.getTime() : date.setHours(now.getHours(), now.getMinutes())
  const duration = defaultDuration
  let dueDate = startDate + duration
  let allDay = false
  let location = ''
  let timeZone: string = getUserTimezone()

  let reminders = [30 * 60 * 1000]

  let description: string = ''
  let visibility: Visibility = 'private'
  const me = getCurrentAccount()
  let space: Ref<Calendar> = `${me._id}_calendar` as Ref<Calendar>

  const q = createQuery()
  q.query(calendar.class.ExternalCalendar, { default: true, members: me._id, archived: false }, (res) => {
    if (res.length > 0) {
      space = res[0]._id
    }
  })

  let rules: RecurringRule[] = []

  const currentUser = getCurrentAccount() as PersonAccount
  let participants: Ref<Person>[] = [currentUser.person]
  let externalParticipants: string[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function saveEvent () {
    let date: number | undefined
    if (startDate != null) date = startDate
    if (date === undefined) return
    if (title === '') return
    if (rules.length > 0) {
      await client.addCollection(calendar.class.ReccuringEvent, space, attachedTo, attachedToClass, 'events', {
        eventId: generateEventId(),
        date: allDay ? saveUTC(date) : date,
        dueDate: allDay ? saveUTC(dueDate) : dueDate,
        externalParticipants,
        rdate: [],
        exdate: [],
        rules,
        reminders,
        description,
        participants,
        visibility,
        title,
        location,
        allDay,
        access: 'owner',
        originalStartTime: allDay ? saveUTC(date) : date,
        timeZone
      })
    } else {
      await client.addCollection(calendar.class.Event, space, attachedTo, attachedToClass, 'events', {
        eventId: generateEventId(),
        date: allDay ? saveUTC(date) : date,
        dueDate: allDay ? saveUTC(dueDate) : dueDate,
        externalParticipants,
        description,
        visibility,
        participants,
        reminders,
        title,
        location,
        allDay,
        timeZone,
        access: 'owner'
      })
    }
    dispatch('close')
  }
</script>

<EventManager
  bind:title
  bind:startDate
  bind:dueDate
  bind:visibility
  bind:participants
  bind:externalParticipants
  bind:allDay
  bind:reminders
  bind:space
  bind:timeZone
  bind:description
  bind:location
  bind:rules
  {duration}
  on:save={saveEvent}
  on:close={() => dispatch('close')}
/>