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
  import { Calendar, RecurringRule, Visibility } from "@hcengineering/calendar"
  import { Button, EditBox, FocusHandler, Icon, IconClose, Scroller, createFocusManager, showPopup } from "@hcengineering/ui"
  import EventTimeExtraButton from "./EventTimeExtraButton.svelte"
  import EventTimeEditor from "./EventTimeEditor.svelte"
  import { Ref } from "@hcengineering/core"
  import { createEventDispatcher } from "svelte"
  import LocationEditor from "./LocationEditor.svelte"
  import EventParticipants from "./EventParticipants.svelte"
  import { StyledTextBox } from "@hcengineering/text-editor"
  import CalendarSelector from "./CalendarSelector.svelte"
  import VisibilityEditor from "./VisibilityEditor.svelte"
  import EventReminders from "./EventReminders.svelte"
  import calendar from '../plugin'
  import { Person } from "@hcengineering/contact"
  import presentation from '@hcengineering/presentation'
  import ReccurancePopup from "./ReccurancePopup.svelte"

  const defaultDuration = 60 * 60 * 1000
  const allDayDuration = 24 * 60 * 60 * 1000 - 1

  export let title: string
  
  export let startDate: number
  export let dueDate: number
  export let duration: number
  export let allDay: boolean
  export let reminders: number[]
  export let space: Ref<Calendar>
  export let timeZone: string

  export let readOnly = false

  export let description: string
  export let location: string

  export let rules: RecurringRule[]

  export let visibility: Visibility
  let visibilityIcon = calendar.icon.Hidden;

  $: {
    switch (visibility) {
      case 'public':
        visibilityIcon = calendar.icon.Public;
        break;
      case 'freeBusy':
        visibilityIcon = calendar.icon.Private;
        break;
      case 'private':
        visibilityIcon = calendar.icon.Hidden;
        break;
      default:
        visibilityIcon = calendar.icon.Hidden;
    }
  }

  export let participants: Ref<Person>[]
  export let externalParticipants: string[]

  const manager = createFocusManager()

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

  const dispatch = createEventDispatcher();

  function handleSaveButtonClick() {
    dispatch('save');
  }

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
        <Icon icon={visibilityIcon} size={'small'} />
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
      disabled={readOnly || title === ''}
      on:click={handleSaveButtonClick}
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
