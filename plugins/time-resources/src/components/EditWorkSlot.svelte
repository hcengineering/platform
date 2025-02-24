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
  import { Event } from '@hcengineering/calendar'
  import {
    CalendarSelector,
    EventReminders,
    EventTimeEditor,
    VisibilityEditor,
    isReadOnly
  } from '@hcengineering/calendar-resources'
  import calendar from '@hcengineering/calendar-resources/src/plugin'
  import { DocumentUpdate } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import { Button, EditBox, Icon, IconClose, createFocusManager } from '@hcengineering/ui'
  import FocusHandler from '@hcengineering/ui/src/components/FocusHandler.svelte'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import TaskSelector from './TaskSelector.svelte'

  export let object: WorkSlot
  $: readOnly = isReadOnly(object)

  let title = object.title

  let startDate = object.date
  const duration = object.dueDate - object.date
  let dueDate = startDate + duration
  const allDay = object.allDay
  let reminders = [...(object.reminders ?? [])]

  let description = object.description
  let visibility = object.visibility ?? 'public'
  let _calendar = object.calendar

  let _doc: ToDo | undefined

  const q = createQuery()
  q.query(
    object.attachedToClass,
    {
      _id: object.attachedTo
    },
    (res) => {
      _doc = res[0]
    }
  )

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return true
  }

  async function saveEvent () {
    if (readOnly) {
      return
    }
    const update: DocumentUpdate<Event> = {}
    if (object.description !== description) {
      update.description = description.trim()
    }
    if (object.date !== startDate) {
      update.date = startDate
    }
    if (object.dueDate !== dueDate) {
      update.dueDate = dueDate
    }
    if (object.visibility !== visibility) {
      update.visibility = visibility
    }
    if (object.calendar !== _calendar) {
      update.calendar = _calendar
    }
    if (!deepEqual(object.reminders, reminders)) {
      update.reminders = reminders
    }

    if (Object.keys(update).length > 0) {
      await client.update(object, update)
    }
    dispatch('close')
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="eventPopup-container">
  <div class="header flex-between">
    <EditBox bind:value={title} disabled kind={'ghost-large'} fullSize focusable focusIndex={10001} />
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
  <div class="block first flex-no-shrink">
    <EventTimeEditor {allDay} bind:startDate bind:dueDate disabled={readOnly} focusIndex={10004} />
  </div>
  <div class="block flex-no-shrink">
    <div class="flex-row-center gap-1-5 mb-1">
      <Icon icon={calendar.icon.Description} size={'small'} />
      <StyledTextBox
        alwaysEdit={true}
        kind={'indented'}
        maxHeight={'limited'}
        focusIndex={10005}
        showButtons={false}
        placeholder={calendar.string.Description}
        bind:content={description}
      />
    </div>
    <TaskSelector bind:value={_doc} focusIndex={10006} />
  </div>
  <div class="block rightCropPadding">
    <CalendarSelector bind:value={_calendar} disabled={readOnly} focusIndex={10007} />
    <div class="flex-row-center flex-gap-1">
      <Icon icon={calendar.icon.Hidden} size={'small'} />
      <VisibilityEditor bind:value={visibility} kind={'tertiary'} withoutIcon disabled={readOnly} focusIndex={10008} />
    </div>
    <EventReminders bind:reminders disabled={readOnly} focusIndex={10009} />
  </div>
  <div class="flex-between p-5 flex-no-shrink">
    <div />
    <Button
      kind="primary"
      label={presentation.string.Save}
      disabled={readOnly}
      on:click={saveEvent}
      focusIndex={10010}
    />
  </div>
</div>

<style lang="scss">
  .eventPopup-container {
    display: flex;
    flex-direction: column;
    max-width: 25rem;
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
      flex-direction: column;
      padding: 0.75rem 1.25rem;
      min-width: 0;
      min-height: 0;
      border-bottom: 1px solid var(--theme-divider-color);

      &.first {
        padding-top: 0;
      }
      &:not(.rightCropPadding) {
        padding: 0.75rem 1.25rem;
      }
      &.rightCropPadding {
        padding: 0.75rem 1rem 0.75rem 1.25rem;
      }
    }
  }
</style>
