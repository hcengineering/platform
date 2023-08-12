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
  import { Calendar, RecurringRule, generateEventId } from '@hcengineering/calendar'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, CheckBox, EditBox, Icon, IconClose, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { saveUTC } from '../utils'
  import EventParticipants from './EventParticipants.svelte'
  import EventTimeEditor from './EventTimeEditor.svelte'
  import RRulePresenter from './RRulePresenter.svelte'
  import ReccurancePopup from './ReccurancePopup.svelte'

  export let attachedTo: Ref<Doc> = calendar.ids.NoAttached
  export let attachedToClass: Ref<Class<Doc>> = calendar.class.Event
  export let title: string = ''
  export let date: Date | undefined = undefined
  export let withTime = false

  const now = new Date()
  const defaultDuration = 60 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000 - 1

  let startDate =
    date === undefined ? now.getTime() : withTime ? date.getTime() : date.setHours(now.getHours(), now.getMinutes())
  const duration = defaultDuration
  let dueDate = startDate + duration
  let allDay = false

  let description: string = ''

  let rules: RecurringRule[] = []

  const currentUser = getCurrentAccount() as PersonAccount
  let participants: Ref<Person>[] = [currentUser.person]
  let externalParticipants: string[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return title !== undefined && title.trim().length === 0 && participants.length === 0
  }

  async function saveEvent () {
    let date: number | undefined
    if (startDate != null) date = startDate
    if (date === undefined) return
    if (title === '') return
    const space = `${getCurrentAccount()._id}_calendar` as Ref<Calendar>
    if (rules.length > 0) {
      await client.addCollection(calendar.class.ReccuringEvent, space, attachedTo, attachedToClass, 'events', {
        eventId: generateEventId(),
        date: allDay ? saveUTC(date) : date,
        dueDate: allDay ? saveUTC(dueDate) : dueDate,
        externalParticipants,
        rdate: [],
        exdate: [],
        rules,
        description,
        participants,
        title,
        allDay,
        access: 'owner'
      })
    } else {
      await client.addCollection(calendar.class.Event, space, attachedTo, attachedToClass, 'events', {
        eventId: generateEventId(),
        date: allDay ? saveUTC(date) : date,
        dueDate: allDay ? saveUTC(dueDate) : dueDate,
        externalParticipants,
        description,
        participants,
        title,
        allDay,
        access: 'owner'
      })
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
    showPopup(ReccurancePopup, { rules }, undefined, (res) => {
      if (res) {
        rules = res
      }
    })
  }
</script>

<div class="container">
  <div class="header flex-between">
    <EditBox bind:value={title} placeholder={calendar.string.NewEvent} />
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
    <EventTimeEditor {allDay} bind:startDate bind:dueDate />
    <div>
      {#if !allDay && rules.length === 0}
        <div class="flex-row-center flex-gap-3 ext">
          <div class="cursor-pointer" on:click={() => (allDay = true)}>
            <Label label={calendar.string.AllDay} />
          </div>
          <div>
            <Label label={calendar.string.TimeZone} />
          </div>
          <div class="cursor-pointer" on:click={setRecurrance}>
            <Label label={calendar.string.Repeat} />
          </div>
        </div>
      {:else}
        <div>
          <div class="flex-row-center flex-gap-2 mt-1">
            <CheckBox bind:checked={allDay} accented on:value={allDayChangeHandler} />
            <Label label={calendar.string.AllDay} />
          </div>
          <div class="flex-row-center flex-gap-2 mt-1">
            <Icon size="small" icon={calendar.icon.Globe} />
            <Label label={calendar.string.TimeZone} />
          </div>
          <div class="flex-row-center flex-gap-2 mt-1" on:click={setRecurrance}>
            <Icon size="small" icon={calendar.icon.Repeat} />
            {#if rules.length > 0}
              <RRulePresenter {rules} />
            {:else}
              <Label label={calendar.string.Repeat} />
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div class="divider" />
  <div>
    <EventParticipants bind:participants bind:externalParticipants />
  </div>
  <div class="divider" />
  <div class="block">
    <div class="flex-row-center flex-gap-2">
      <Icon icon={calendar.icon.Description} size="small" />
      <EditBox bind:value={description} placeholder={calendar.string.Description} />
    </div>
  </div>
  <div class="divider" />
  <div class="flex-between pool">
    <div />
    <Button kind="accented" label={presentation.string.Create} on:click={saveEvent} disabled={title === ''} />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--theme-popup-color);
    box-shadow: var(--theme-popup-shadow);
    width: 25rem;
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
