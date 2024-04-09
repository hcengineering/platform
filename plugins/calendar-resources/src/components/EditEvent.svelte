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
  import { Event, ReccuringEvent, ReccuringInstance, RecurringRule } from '@hcengineering/calendar'
  import { Person } from '@hcengineering/contact'
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getUserTimezone } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { isReadOnly, saveUTC, updateReccuringInstance } from '../utils'
  import EventManager from './EventManager.svelte'

  export let object: Event
  $: readOnly = isReadOnly(object)

  let title = object.title

  let startDate = object.date
  const duration = object.dueDate - object.date
  let dueDate = startDate + duration
  let allDay = object.allDay
  let visibility = object.visibility ?? 'public'
  let reminders = [...(object.reminders ?? [])]
  let space = object.space
  let timeZone: string = object.timeZone ?? getUserTimezone()

  let description = object.description
  let location = object.location ?? ''

  let rules: RecurringRule[] = (object as ReccuringEvent).rules ?? []

  let participants: Ref<Person>[] = [...object.participants]
  let externalParticipants: string[] = [...(object.externalParticipants ?? [])]

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function saveEvent () {
    if (readOnly) {
      return
    }
    const update: DocumentUpdate<Event> = {}
    if (object.title !== title) {
      update.title = title.trim()
    }
    if (object.description !== description) {
      update.description = description.trim()
    }
    if (object.visibility !== visibility) {
      update.visibility = visibility
    }
    if (object.space !== space) {
      update.space = space
    }
    if (object.location !== location) {
      update.location = location
    }
    if (object.timeZone !== timeZone) {
      update.timeZone = timeZone
    }
    if (allDay !== object.allDay) {
      update.date = allDay ? saveUTC(startDate) : startDate
      update.dueDate = allDay ? saveUTC(dueDate) : dueDate
      update.allDay = allDay
    } else {
      if (object.date !== startDate) {
        update.date = allDay ? saveUTC(startDate) : startDate
      }
      if (object.dueDate !== dueDate) {
        update.dueDate = allDay ? saveUTC(dueDate) : dueDate
      }
    }
    if (!deepEqual(object.participants, participants)) {
      update.participants = participants
    }
    if (!deepEqual(object.externalParticipants, externalParticipants)) {
      update.externalParticipants = externalParticipants
    }
    if (!deepEqual(object.reminders, reminders)) {
      update.reminders = reminders
    }
    if (rules !== (object as ReccuringEvent).rules) {
      ;(update as DocumentUpdate<ReccuringEvent>).rules = rules
    }

    if (Object.keys(update).length > 0) {
      if (object._class === calendar.class.ReccuringInstance) {
        await updateReccuringInstance(update, object as ReccuringInstance)
      } else {
        await client.update(object, update)
      }
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
  {readOnly}
  on:save={saveEvent}
  on:close={() => dispatch('close')}
/>