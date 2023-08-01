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
  import { DateRangeMode } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { DAY, DateRangePresenter, HOUR, MINUTE, themeStore } from '@hcengineering/ui'
  import calendar from '../plugin'

  export let value: Event
  export let noShift: boolean = false

  let dateRangeMode: DateRangeMode

  $: date = value ? new Date(value.date) : undefined
  $: dueDate = value ? new Date(value.dueDate ?? value.date) : undefined

  $: interval = (value.dueDate ?? value.date) - value.date
  $: {
    if (date && date.getMinutes() !== 0 && date.getHours() !== 0 && interval < DAY) {
      dateRangeMode = DateRangeMode.DATETIME
    } else {
      dateRangeMode = DateRangeMode.DATE
    }
  }

  async function formatDueDate (interval: number): Promise<string> {
    let passed = interval
    if (interval < 0) passed = 0
    if (passed < HOUR) {
      return await translate(calendar.string.DueMinutes, { minutes: Math.floor(passed / MINUTE) }, $themeStore.language)
    } else if (passed < DAY) {
      return await translate(calendar.string.DueHours, { hours: Math.floor(passed / HOUR) }, $themeStore.language)
    } else {
      return await translate(calendar.string.DueDays, { days: Math.floor(passed / DAY) }, $themeStore.language)
    }
  }
</script>

<div class="antiSelect">
  {#if date}
    <DateRangePresenter value={date.getTime()} mode={dateRangeMode} {noShift} />
    {#if interval > 0}
      {#await formatDueDate(interval) then t}
        <span class="ml-2 mr-1 whitespace-nowrap">({t})</span>
      {/await}
    {/if}
  {:else}
    No date
  {/if}
</div>
