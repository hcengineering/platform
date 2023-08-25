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
  import { RecurringRule } from '@hcengineering/calendar'
  import { Label, themeStore } from '@hcengineering/ui'
  import calendar from '../plugin'
  import { IntlString, translate } from '@hcengineering/platform'
  import DateLocalePresenter from './DateLocalePresenter.svelte'

  export let rules: RecurringRule[] = []
  $: rule = rules[0]

  const periods: Record<string, IntlString> = {
    DAILY: calendar.string.Day,
    WEEKLY: calendar.string.Week,
    MONTHLY: calendar.string.Month,
    YEARLY: calendar.string.Year
  }

  const weekdays: Record<string, IntlString> = {
    MO: calendar.string.MondayShort,
    TU: calendar.string.TuesdayShort,
    WE: calendar.string.WednesdayShort,
    TH: calendar.string.ThursdayShort,
    FR: calendar.string.FridayShort,
    SA: calendar.string.SaturdayShort,
    SU: calendar.string.SundayShort
  }

  async function getDays (days: string[], lang: string): Promise<string> {
    let result = ''
    for (const day of Object.keys(weekdays)) {
      if (days.includes(day)) {
        const curr = await translate(weekdays[day], {}, lang)
        result += curr
        result += ', '
      }
    }
    return result.slice(0, -2)
  }
</script>

{#if rule}
  <Label label={calendar.string.Every} />
  {rule.interval ?? 1}
  <Label label={periods[rule.freq]} params={{ count: rule.interval ?? 1 }} />
  <span class="ml-2 content-darker-color">
    {#if rule.freq === 'WEEKLY' && rule.byDay}
      {#await getDays(rule.byDay ?? [], $themeStore.language) then str}
        {str}
      {/await}
    {/if}
    {#if rule.endDate}
      <span class="lower"><Label label={calendar.string.OnUntil} /></span>
      <DateLocalePresenter date={rule.endDate} />
    {/if}
    {#if rule.count}
      {rule.count}
      <Label label={calendar.string.Times} params={{ count: rule.count }} />
    {/if}
  </span>
{/if}
