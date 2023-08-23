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
  import { Event, ReccuringEvent, ReccuringInstance, RecurringRule, generateEventId } from '@hcengineering/calendar'
  import { Person } from '@hcengineering/contact'
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, CheckBox, DAY, EditBox, Icon, IconClose, Label, closePopup, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { isReadOnly, saveUTC } from '../utils'
  import EventParticipants from './EventParticipants.svelte'
  import EventTimeEditor from './EventTimeEditor.svelte'
  import RRulePresenter from './RRulePresenter.svelte'
  import ReccurancePopup from './ReccurancePopup.svelte'
  import UpdateRecInstancePopup from './UpdateRecInstancePopup.svelte'
  import { deepEqual } from 'fast-equals'
  import EventReminders from './EventReminders.svelte'

  export let object: Event
  $: readOnly = isReadOnly(object)

  let title = object.title

  const defaultDuration = 60 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000 - 1

  let startDate = object.date
  const duration = object.dueDate - object.date
  let dueDate = startDate + duration
  let allDay = object.allDay
  let reminders = [...(object.reminders ?? [])]

  let description = object.description

  let rules: RecurringRule[] = (object as ReccuringEvent).rules ?? []

  let participants: Ref<Person>[] = object.participants
  let externalParticipants: string[] = object.externalParticipants ?? []

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return title !== undefined && title.trim().length === 0 && participants.length === 0
  }

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
    if (deepEqual(object.reminders, reminders) === false) {
      update.reminders = reminders
    }
    if (rules !== (object as ReccuringEvent).rules) {
      ;(update as DocumentUpdate<ReccuringEvent>).rules = rules
    }

    if (Object.keys(update).length > 0) {
      if (object._class === calendar.class.ReccuringInstance) {
        await updateHandler(update)
      } else {
        await client.update(object, update)
      }
    }
    dispatch('close')
  }

  async function allDayChangeHandler () {
    if (allDay) {
      startDate = new Date(startDate).setHours(0, 0, 0, 0)
      if (dueDate - startDate < allDayDuration) dueDate = allDayDuration + startDate
      else dueDate = new Date(dueDate).setHours(23, 59, 59, 999)
    } else {
      dueDate = startDate + defaultDuration
    }
  }

  function setRecurrance () {
    if (readOnly) {
      return
    }
    showPopup(ReccurancePopup, { rules, startDate }, undefined, (res) => {
      if (res) {
        rules = res
      }
    })
  }

  async function updatePast (ops: DocumentUpdate<Event>) {
    const obj = object as ReccuringInstance
    const origin = await client.findOne(calendar.class.ReccuringEvent, {
      eventId: obj.recurringEventId,
      space: obj.space
    })
    if (origin !== undefined) {
      await client.addCollection(
        calendar.class.ReccuringEvent,
        origin.space,
        origin.attachedTo,
        origin.attachedToClass,
        origin.collection,
        {
          ...origin,
          date: obj.date,
          dueDate: obj.dueDate,
          ...ops,
          eventId: generateEventId()
        }
      )
      const targetDate = ops.date ?? obj.date
      await client.update(origin, {
        rules: [{ ...origin.rules[0], endDate: targetDate - DAY }],
        rdate: origin.rdate.filter((p) => p < targetDate)
      })
      const instances = await client.findAll(calendar.class.ReccuringInstance, {
        recurringEventId: origin.eventId,
        date: { $gte: targetDate }
      })
      for (const instance of instances) {
        await client.remove(instance)
      }
    }
  }

  async function updateHandler (ops: DocumentUpdate<ReccuringEvent>) {
    const obj = object as ReccuringInstance
    if (obj.virtual !== true) {
      await client.update(object, ops)
    } else {
      showPopup(UpdateRecInstancePopup, { currentAvailable: ops.rules === undefined }, undefined, async (res) => {
        if (res !== null) {
          if (res.mode === 'current') {
            await client.addCollection(
              obj._class,
              obj.space,
              obj.attachedTo,
              obj.attachedToClass,
              obj.collection,
              {
                title: obj.title,
                description: obj.description,
                date: obj.date,
                dueDate: obj.dueDate,
                allDay: obj.allDay,
                participants: obj.participants,
                externalParticipants: obj.externalParticipants,
                originalStartTime: obj.originalStartTime,
                recurringEventId: obj.recurringEventId,
                reminders: obj.reminders,
                location: obj.location,
                eventId: obj.eventId,
                access: 'owner',
                rules: obj.rules,
                exdate: obj.exdate,
                rdate: obj.rdate,
                ...ops
              },
              obj._id
            )
          } else if (res.mode === 'all') {
            const base = await client.findOne(calendar.class.ReccuringEvent, {
              space: obj.space,
              eventId: obj.recurringEventId
            })
            if (base !== undefined) {
              await client.update(base, ops)
            }
          } else if (res.mode === 'next') {
            await updatePast(ops)
          }
        }
        closePopup()
      })
    }
  }
</script>

<div class="container">
  <div class="header flex-between">
    {#if object.attachedTo === calendar.ids.NoAttached}
      <EditBox bind:value={title} placeholder={calendar.string.NewEvent} disabled={readOnly} />
    {:else}
      <div />
    {/if}
    <Button
      id="card-close"
      focusIndex={10002}
      icon={IconClose}
      iconProps={{ size: 'medium', fill: 'var(--theme-dark-color)' }}
      kind={'ghost'}
      size={'small'}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
  <div class="time">
    <EventTimeEditor {allDay} bind:startDate bind:dueDate disabled={readOnly} />
    <div>
      {#if !allDay && rules.length === 0}
        <div class="flex-row-center flex-gap-3 ext">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="cursor-pointer" on:click={() => (allDay = true)}>
            <Label label={calendar.string.AllDay} />
          </div>
          <div>
            <Label label={calendar.string.TimeZone} />
          </div>
          {#if rules.length > 0}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="cursor-pointer" on:click={setRecurrance}>
              <Label label={calendar.string.Repeat} />
            </div>
          {/if}
        </div>
      {:else}
        <div>
          <div class="flex-row-center flex-gap-2 mt-1">
            <CheckBox bind:checked={allDay} accented on:value={allDayChangeHandler} readonly={readOnly} />
            <Label label={calendar.string.AllDay} />
          </div>
          <div class="flex-row-center flex-gap-2 mt-1">
            <Icon size="small" icon={calendar.icon.Globe} />
            <Label label={calendar.string.TimeZone} />
          </div>
          {#if rules.length > 0}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="flex-row-center flex-gap-2 mt-1" on:click={setRecurrance}>
              <Icon size="small" icon={calendar.icon.Repeat} />
              {#if rules.length > 0}
                <RRulePresenter {rules} />
              {:else}
                <Label label={calendar.string.Repeat} />
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div class="divider" />
  <div>
    <EventParticipants bind:participants bind:externalParticipants disabled={readOnly} />
  </div>
  <div class="divider" />
  <div class="block">
    <div class="flex-row-center flex-gap-2">
      <Icon icon={calendar.icon.Description} size="small" />
      <EditBox bind:value={description} placeholder={calendar.string.Description} disabled={readOnly} />
    </div>
  </div>
  <div class="divider" />
  <div class="block">
    <EventReminders bind:reminders />
  </div>
  <div class="divider" />
  <div class="flex-between pool">
    <div />
    <Button kind="accented" label={presentation.string.Save} disabled={readOnly} on:click={saveEvent} />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--theme-popup-color);
    box-shadow: var(--theme-popup-shadow);
    min-width: 25rem;
    border-radius: 1rem;

    .header {
      margin: 0.75rem 0.75rem 0 0.75rem;
      padding: 0.5rem;
    }

    .block {
      padding-left: 1.25rem;
      padding-right: 1.25rem;
    }

    .divider {
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    }

    .pool {
      margin-top: 0.5rem;
      margin: 1.25rem;
    }

    .time {
      margin-left: 1.25rem;
      margin-right: 1.25rem;

      .ext {
        color: var(--theme-dark-color);
      }
    }
  }
</style>
