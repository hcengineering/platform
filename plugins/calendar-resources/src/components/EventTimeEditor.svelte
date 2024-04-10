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
  import { areDatesEqual, getUserTimezone } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { utcToZonedTime } from 'date-fns-tz'
  import DateEditor from './DateEditor.svelte'

  export let startDate: number
  export let dueDate: number
  export let allDay: boolean
  export let disabled: boolean = false
  export let timeZone: string = getUserTimezone()
  export let focusIndex = -1
  export let grow: boolean = false
  export let fixed: string | undefined = undefined

  $: sameDate = areDatesEqual(utcToZonedTime(startDate, timeZone), utcToZonedTime(dueDate, timeZone))

  let diff = dueDate - startDate
  const allDayDuration = 24 * 60 * 60 * 1000 - 1
  const dispatch = createEventDispatcher()

  function dateChange () {
    startDate = allDay ? new Date(startDate).setHours(0, 0, 0, 0) : startDate
    dueDate = startDate + (allDay ? allDayDuration : diff)
    dispatch('change', { startDate, dueDate })
  }

  function dueChange () {
    const newDiff = dueDate - startDate
    if (newDiff > 0) {
      dueDate = allDay ? new Date(dueDate).setHours(23, 59, 59, 999) : dueDate
    } else {
      dueDate = startDate + (allDay ? allDayDuration : diff)
    }
    diff = dueDate - startDate
    dispatch('dueChange', { dueDate })
  }
</script>

<div class="flex-row-center flex-gap-2 flex-no-shrink" class:flex-grow={grow}>
  <DateEditor
    bind:date={startDate}
    direction={sameDate ? 'horizontal' : 'vertical'}
    withoutTime={allDay}
    {timeZone}
    on:update={dateChange}
    {disabled}
    {focusIndex}
    fixed={fixed === undefined ? undefined : fixed + '-startDate'}
  />
  <div class="flex-no-shrink content-darker-color">—</div>
  <DateEditor
    bind:date={dueDate}
    direction={sameDate ? 'horizontal' : 'vertical'}
    withoutTime={allDay}
    showDate={!sameDate}
    difference={startDate}
    {disabled}
    {timeZone}
    focusIndex={focusIndex !== -1 ? focusIndex + 1 : focusIndex}
    fixed={fixed === undefined ? undefined : fixed + '-dueDate'}
    on:update={dueChange}
  />
</div>
