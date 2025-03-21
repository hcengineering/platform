<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Data, generateUuid, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { Schedule, ScheduleAvailability } from '@hcengineering/calendar'
  import ui, {
    Button,
    ButtonIcon,
    EditBox,
    FocusHandler,
    Icon,
    IconCircleAdd,
    IconClose,
    IconDelete,
    IconDropdown,
    Label,
    Scroller,
    SelectPopup,
    TimeInputBox,
    capitalizeFirstLetter,
    createFocusManager,
    deviceOptionsStore as deviceInfo,
    eventToHTMLElement,
    formatDuration,
    getUserTimezone,
    getWeekDayName,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import TimeZoneSelector from './TimeZoneSelector.svelte'

  export let schedule: Schedule | undefined

  type EditableAvailability = Record<number, { start: Date, end: Date }[]>

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let title = schedule?.title ?? ''
  let description = schedule?.description ?? ''
  let meetingDuration = schedule?.meetingDuration ?? 30 * 60_000
  let formattedMeetingDuration: string | undefined
  let meetingInterval = schedule?.meetingInterval ?? 0
  let formattedMeetingInterval: string | undefined
  const availability: EditableAvailability = {}
  let availabilityEditOffset = 0
  let timeZone = schedule?.timeZone ?? getUserTimezone()

  const durationVariants: { msec: number, text: string }[] = []
  const intervalVariants: { msec: number, text: string }[] = []

  $: formatMeetingDuration(meetingDuration)
  $: formatMeetingInterval(meetingInterval)
  $: formatDurationVariants()
  $: formatIntervalVariants()
  $: makeEditableAvailability()

  function formatDurationVariants (): void {
    ;[15, 30, 45, 60, 90, 120].forEach((minutes) => {
      const msec = minutes * 60_000
      formatDuration(msec, $themeStore.language)
        .then((text) => {
          durationVariants.push({ msec, text })
        })
        .catch((err) => {
          console.error(err)
        })
    })
  }

  function formatIntervalVariants (): void {
    ;[0, 5, 10, 15, 30, 45, 60].forEach((minutes) => {
      const msec = minutes * 60_000
      formatDuration(msec, $themeStore.language)
        .then((text) => {
          intervalVariants.push({ msec, text })
        })
        .catch((err) => {
          console.error(err)
        })
    })
  }

  function defaultAvailability (): { start: Date, end: Date } {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    const end = new Date()
    end.setHours(18, 0, 0, 0)
    return { start, end }
  }

  function makeEditableAvailability (): void {
    const offset = new Date()
    offset.setHours(0, 0, 0, 0)
    availabilityEditOffset = offset.getTime()
    if (schedule === undefined) {
      for (let i = 0; i < 7; i++) {
        availability[i] = i > 0 && i < 6 ? [defaultAvailability()] : []
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const periods = schedule.availability?.[i] ?? []
        if (periods.length > 0) {
          const start = new Date(availabilityEditOffset + periods[0].start)
          const end = new Date(availabilityEditOffset + periods[0].end)
          availability[i] = [{ start, end }]
        } else {
          availability[i] = []
        }
      }
    }
  }

  function getStorableAvailability (): ScheduleAvailability {
    const result: ScheduleAvailability = {}
    for (let i = 0; i < 7; i++) {
      const periods = availability[i] ?? []
      if (periods.length > 0) {
        const start = periods[0].start.getTime() - availabilityEditOffset
        const end = periods[0].end.getTime() - availabilityEditOffset
        if (start > end) {
          result[i] = [{ start: end, end: start }]
        } else {
          result[i] = [{ start, end }]
        }
      }
    }
    return result
  }

  function formatMeetingDuration (duration: number): void {
    formatDuration(duration, $themeStore.language)
      .then((res) => {
        formattedMeetingDuration = res
      })
      .catch((err) => {
        console.error(err)
      })
  }

  function formatMeetingInterval (duration: number): void {
    formatDuration(duration, $themeStore.language)
      .then((res) => {
        formattedMeetingInterval = res
      })
      .catch((err) => {
        console.error(err)
      })
  }

  export function canClose (): boolean {
    return title === ''
  }

  async function saveSchedule (): Promise<void> {
    if (schedule === undefined) {
      const currentUser = getCurrentEmployee()
      const data: Data<Schedule> = {
        owner: currentUser,
        title,
        description,
        meetingDuration,
        meetingInterval,
        availability: getStorableAvailability(),
        timeZone
      }
      const id = generateUuid() as Ref<Schedule>
      await client.createDoc(calendar.class.Schedule, calendar.space.Calendar, data, id)
    } else {
      await client.update(schedule, {
        title,
        description,
        meetingDuration,
        meetingInterval,
        availability: getStorableAvailability(),
        timeZone
      })
    }
    dispatch('close')
  }

  function showDurationVariants (ev: MouseEvent): void {
    durationVariants.sort((a, b) => a.msec - b.msec)
    showPopup(
      SelectPopup,
      {
        value: durationVariants.map((duration, i) => ({
          id: i,
          text: duration.text,
          isSelected: duration.msec === meetingDuration
        }))
      },
      eventToHTMLElement(ev),
      async (i) => {
        const duration = durationVariants[i]
        if (duration !== undefined) {
          meetingDuration = duration.msec
        }
      }
    )
  }

  function showIntervalVariants (ev: MouseEvent): void {
    intervalVariants.sort((a, b) => a.msec - b.msec)
    showPopup(
      SelectPopup,
      {
        value: intervalVariants.map((interval, i) => ({
          id: i,
          label: i === 0 ? ui.string.None : undefined,
          text: i > 0 ? interval.text : undefined,
          isSelected: interval.msec === meetingInterval
        }))
      },
      eventToHTMLElement(ev),
      async (i) => {
        const interval = intervalVariants[i]
        if (interval !== undefined) {
          meetingInterval = interval.msec
        }
      }
    )
  }

  function getWeekDayNames (): { weekDay: number, dayName: string }[] {
    const today = new Date()
    const offset = 0 + $deviceInfo.firstDayOfWeek - today.getDay()
    const startDate = today.getTime() + 86_400_000 * offset
    const result = []
    for (let i = 0; i < 7; i++) {
      result.push({
        weekDay: ($deviceInfo.firstDayOfWeek + i) % 7,
        dayName: capitalizeFirstLetter(getWeekDayName(new Date(startDate + i * 86_400_000), 'short'))
      })
    }
    return result
  }
</script>

<FocusHandler {manager} />

<div class="scheduleEditor-container">
  <div class="header flex-between">
    <EditBox
      bind:value={title}
      placeholder={calendar.string.ScheduleTitlePlaceholder}
      kind={'ghost-large'}
      fullSize
      focusable
      autoFocus
      focusIndex={10001}
    />
    <div class="flex-row-center gap-1 flex-no-shrink ml-3">
      <Button
        id="card-close"
        focusIndex={10002}
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
    <div class="block row">
      <div class="top-icon">
        <Icon icon={calendar.icon.Description} size={'small'} />
      </div>
      <StyledTextBox
        alwaysEdit={true}
        isScrollable={false}
        kind={'indented'}
        showButtons={false}
        focusIndex={10003}
        placeholder={calendar.string.Description}
        bind:content={description}
      />
    </div>
    <div class="block rightCropPadding">
      <div class="flex-row-top flex-gap-1">
        <Icon icon={calendar.icon.Duration} size={'small'} />
        <div class="prop">
          <Label label={calendar.string.MeetingDuration} />
          <Button
            focusIndex={10004}
            iconRight={IconDropdown}
            label={ui.string.TimeTooltip}
            labelParams={{ value: formattedMeetingDuration }}
            on:click={showDurationVariants}
          />
        </div>
        <div class="prop">
          <Label label={calendar.string.MeetingInterval} />
          <Button
            focusIndex={10005}
            iconRight={IconDropdown}
            label={meetingInterval === 0 ? ui.string.None : ui.string.TimeTooltip}
            labelParams={{ value: formattedMeetingInterval }}
            on:click={showIntervalVariants}
          />
        </div>
      </div>
    </div>
    <div class="block rightCropPadding">
      <div class="flex-row-center flex-gap-1-5">
        <Icon icon={calendar.icon.Globe} size={'small'} />
        <TimeZoneSelector bind:timeZone />
      </div>
    </div>
    <div class="block rightCropPadding">
      <div class="flex-row-top flex-gap-1">
        <Icon icon={calendar.icon.Timer} size={'small'} />
        <div class="prop">
          <Label label={calendar.string.ScheduleAvailability} />
          {#each getWeekDayNames() as { weekDay, dayName }, i}
            <div class="flex-row-center flex-gap-1 availability">
              <span class="weekDay">
                {dayName}
              </span>
              <div class="period">
                {#if availability[weekDay].length > 0}
                  <TimeInputBox bind:currentDate={availability[weekDay][0].start} size="narrow" />
                  &mdash;
                  <TimeInputBox bind:currentDate={availability[weekDay][0].end} size="narrow" />
                {:else}
                  <Label label={calendar.string.ScheduleUnavailable} />
                {/if}
              </div>
              {#if availability[weekDay].length > 0}
                <ButtonIcon
                  icon={IconDelete}
                  size="small"
                  kind="tertiary"
                  tooltip={{ label: calendar.string.ScheduleRemovePeriod }}
                  on:click={() => {
                    availability[weekDay] = []
                  }}
                />
              {:else}
                <ButtonIcon
                  icon={IconCircleAdd}
                  size="small"
                  kind="tertiary"
                  tooltip={{ label: calendar.string.ScheduleAddPeriod }}
                  on:click={() => {
                    availability[weekDay] = [defaultAvailability()]
                  }}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </Scroller>
  <div class="antiDivider noMargin" />
  <div class="flex-between p-5 flex-no-shrink">
    <div />
    <Button
      kind="primary"
      label={view.string.Save}
      focusIndex={10104}
      on:click={saveSchedule}
      disabled={title === ''}
    />
  </div>
</div>

<style lang="scss">
  .scheduleEditor-container {
    display: flex;
    flex-direction: column;
    max-width: 21rem;
    min-width: 21rem;
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
      min-width: 0;
      min-height: 0;

      &:not(:last-child) {
        border-bottom: 1px solid var(--theme-divider-color);
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

    .prop {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0rem 0.75rem 0rem 0.75rem;
      gap: 0.5rem;

      .availability {
        &:first-child {
          margin-top: 0.5rem;
        }

        .period {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 11rem;
        }
      }
    }

    .top-icon {
      flex-shrink: 0;
      margin-top: 1.375rem;
      margin-right: 0.125rem;
    }

    .weekDay {
      width: 3rem;
    }
  }
</style>
