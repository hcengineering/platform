<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import { ticker } from '..'
  import ui from '../plugin'
  import { tooltip } from '../tooltips'
  import { DAY, HOUR, MINUTE, MONTH, YEAR } from '../types'

  export let value: number | undefined
  export let kind: 'no-border' | 'list' = 'no-border'

  let time: string = ''

  function calculateMonthsPassed (now: number, value: number): number {
    const startDate: Date = new Date(value)
    const endDate: Date = new Date(now)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth()
    const endYear = endDate.getFullYear()
    const endMonth = endDate.getMonth()

    return (endYear - startYear) * 12 + (endMonth - startMonth)
  }

  function formatTime (now: number, value: number): void {
    let passed = now - value
    if (passed < 0) passed = 0
    if (passed < HOUR) {
      translateCB(ui.string.MinutesAgo, { minutes: Math.floor(passed / MINUTE) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < DAY) {
      translateCB(ui.string.HoursAgo, { hours: Math.floor(passed / HOUR) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < MONTH) {
      translateCB(ui.string.DaysAgo, { days: Math.floor(passed / DAY) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < YEAR) {
      translateCB(ui.string.MonthsAgo, { months: calculateMonthsPassed(now, value) }, $themeStore.language, (res) => {
        time = res
      })
    } else {
      translateCB(ui.string.YearsAgo, { years: Math.floor(passed / YEAR) }, $themeStore.language, (res) => {
        time = res
      })
    }
  }

  $: value && formatTime($ticker, value)

  $: tooltipValue = value
    ? new Date(value).toLocaleString('default', {
      minute: '2-digit',
      hour: 'numeric',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    : undefined
</script>

<span
  use:tooltip={{ label: ui.string.TimeTooltip, props: { value: tooltipValue } }}
  class="overflow-label"
  class:text-sm={kind === 'list'}
  class:content-dark-color={kind === 'list'}
>
  {time}
</span>
span>
