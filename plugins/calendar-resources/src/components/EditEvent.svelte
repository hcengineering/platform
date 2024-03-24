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
  import presentation, { getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import {
    Button,
    EditBox,
    FocusHandler,
    Icon,
    IconClose,
    createFocusManager,
    getUserTimezone,
    showPopup,
    Scroller
  } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { isReadOnly, saveUTC, updateReccuringInstance } from '../utils'
  import CalendarSelector from './CalendarSelector.svelte'
  import EventParticipants from './EventParticipants.svelte'
  import EventReminders from './EventReminders.svelte'
  import EventTimeEditor from './EventTimeEditor.svelte'
  import EventTimeExtraButton from './EventTimeExtraButton.svelte'
  import LocationEditor from './LocationEditor.svelte'
  import ReccurancePopup from './ReccurancePopup.svelte'
  import VisibilityEditor from './VisibilityEditor.svelte'

  export let object: Event
  $: readOnly = isReadOnly(object)

  let title = object.title

  const defaultDuration = 60 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000 - 1

  let startDate = object.date
  const duration = object.dueDate - object.date
  let dueDate = startDate + duration
  let allDay = object.allDay
  let visibility = object.visibility ?? 'public'
  let reminders = [...(object.reminders ?? [])]
  let space = object.space
  let timeZone: string = object.timeZone ?? getUserTimezone()

  let description = object.description
  let location = object.location

  let rules: RecurringRule[] = (object as ReccuringEvent).rules ?? []

  let participants: Ref<Person>[] = [...object.participants]
  let externalParticipants: string[] = [...(object.externalParticipants ?? [])]

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

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="eventPopup-container">
  <div class="header flex-between">
    <EditBox
      bind:value={title}
      placeholder={calendar.string.EventTitlePlaceholder}
      disabled={readOnly}
      kind={'ghost-large'}
      fullSize
      focusable
      autoFocus
      focusIndex={10001}
    />
    <div class="flex-row-center gap-1 flex-no-shrink ml-3">
      <Button
        id="card-close"
        focusIndex={10003}
        icon={IconClose}
        kind={'ghost'}
        size={'small'}
        on:click={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <Scroller thinScrollBars>
    <div class="block first">
      <EventTimeEditor {allDay} bind:startDate {timeZone} bind:dueDate disabled={readOnly} focusIndex={10004} />
      <EventTimeExtraButton
        bind:allDay
        bind:timeZone
        bind:rules
        on:repeat={setRecurrance}
        {readOnly}
        on:allday={allDayChangeHandler}
        noRepeat
      />
    </div>
    <div class="block rightCropPadding">
      <LocationEditor bind:value={location} focusIndex={10005} />
      <EventParticipants bind:participants bind:externalParticipants disabled={readOnly} focusIndex={10006} />
    </div>
    <div class="block row gap-1-5">
      <div class="top-icon">
        <Icon icon={calendar.icon.Description} size={'small'} />
      </div>
      <StyledTextBox
        alwaysEdit={true}
        isScrollable={false}
        focusIndex={10007}
        kind={'indented'}
        showButtons={false}
        placeholder={calendar.string.Description}
        bind:content={description}
      />
    </div>
    <div class="divider" />
    <div class="block rightCropPadding">
      <CalendarSelector bind:value={space} focusIndex={10008} />
      <div class="flex-row-center flex-gap-1">
        <Icon icon={calendar.icon.Hidden} size={'small'} />
        <VisibilityEditor bind:value={visibility} kind={'tertiary'} withoutIcon focusIndex={10009} />
      </div>
      <EventReminders bind:reminders focusIndex={10010} />
    </div>
  </Scroller>
  <div class="antiDivider noMargin" />
  <div class="flex-between p-5 flex-no-shrink">
    <div />
    <Button
      kind="primary"
      label={presentation.string.Save}
      focusIndex={10011}
      disabled={readOnly}
      on:click={saveEvent}
    />
  </div>
</div>

<style lang="scss">
  .eventPopup-container {
    display: flex;
    flex-direction: column;
    max-width: 40rem;
    min-width: 25rem;
    min-height: 0;
    background: var(--theme-popup-color);
    border-radius: 1rem;
    box-shadow: var(--theme-popup-shadow);

    .header {
      flex-shrink: 0;
      padding: 0.75rem 0.75rem 0.5rem;
    }

    .block {
      display: flex;
      flex-shrink: 0;
      padding: 0.75rem 1.25rem;
      min-width: 0;
      min-height: 0;

      &:not(:last-child) {
        border-bottom: 1px solid var(--theme-divider-color);
      }
      &:not(.row) {
        flex-direction: column;
      }
      &.first {
        padding-top: 0;
      }
      &:not(.rightCropPadding) {
        padding: 0.75rem 1.25rem;
      }
      &.rightCropPadding {
        padding: 0.75rem 1rem 0.75rem 1.25rem;
      }
      &.row {
        padding: 0 1.25rem 0.5rem;
      }
    }
    .top-icon {
      flex-shrink: 0;
      margin-top: 1.375rem;
    }
  }
</style>
