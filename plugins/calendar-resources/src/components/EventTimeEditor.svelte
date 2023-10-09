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
  import { Icon, areDatesEqual, IconArrowRight } from '@hcengineering/ui'
  import calendar from '../plugin'
  import DateEditor from './DateEditor.svelte'
  import { createEventDispatcher } from 'svelte'

  export let startDate: number
  export let dueDate: number
  export let allDay: boolean
  export let disabled: boolean = false

  $: sameDate = areDatesEqual(new Date(startDate), new Date(dueDate))

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

<div class="flex-row-center">
  <div class="self-start flex-no-shrink mt-2 mr-1-5 content-dark-color">
    <Icon icon={calendar.icon.Watch} size={'small'} />
  </div>
  <DateEditor
    bind:date={startDate}
    direction={sameDate ? 'horizontal' : 'vertical'}
    withoutTime={allDay}
    on:update={dateChange}
    {disabled}
  />
  <div class="self-end flex-no-shrink mb-2 ml-1-5 mr-1-5 content-darker-color">
    <IconArrowRight size={'small'} />
  </div>
  <DateEditor
    bind:date={dueDate}
    direction={sameDate ? 'horizontal' : 'vertical'}
    withoutTime={allDay}
    showDate={!sameDate}
    difference={startDate}
    {disabled}
    on:update={dueChange}
  />
</div>
