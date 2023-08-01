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
  import { translate } from '@hcengineering/platform'
  import { DAY, HOUR, MINUTE, MONTH, YEAR } from '../types'
  import ui from '../plugin'
  import { tooltip } from '../tooltips'
  import { themeStore } from '@hcengineering/theme'
  import { ticker } from '..'

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

  async function formatTime (now: number, value: number) {
    let passed = now - value
    if (passed < 0) passed = 0
    if (passed < HOUR) {
      time = await translate(ui.string.Minutes, { minutes: Math.floor(passed / MINUTE) }, $themeStore.language)
    } else if (passed < DAY) {
      time = await translate(ui.string.Hours, { hours: Math.floor(passed / HOUR) }, $themeStore.language)
    } else if (passed < MONTH) {
      time = await translate(ui.string.Days, { days: Math.floor(passed / DAY) }, $themeStore.language)
    } else if (passed < YEAR) {
      time = await translate(ui.string.Months, { months: calculateMonthsPassed(now, value) }, $themeStore.language)
    } else {
      time = await translate(ui.string.Years, { years: Math.floor(passed / YEAR) }, $themeStore.language)
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
