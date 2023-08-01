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
  import { translate } from '@hcengineering/platform'
  import tracker from '../../plugin'
  import { DAY, HOUR, MINUTE, MONTH, YEAR, themeStore } from '@hcengineering/ui'

  export let value: number

  let time: string = ''

  async function formatTime (passed: number) {
    if (passed < 0) passed = 0
    if (passed < HOUR) {
      time = await translate(tracker.string.DurMinutes, { minutes: Math.floor(passed / MINUTE) }, $themeStore.language)
    } else if (passed < DAY) {
      time = await translate(tracker.string.DurHours, { hours: Math.floor(passed / HOUR) }, $themeStore.language)
    } else if (passed < MONTH) {
      time = await translate(tracker.string.DurDays, { days: Math.floor(passed / DAY) }, $themeStore.language)
    } else if (passed < YEAR) {
      time = await translate(tracker.string.DurMonths, { months: Math.floor(passed / MONTH) }, $themeStore.language)
    } else {
      time = await translate(tracker.string.DurYears, { years: Math.floor(passed / YEAR) }, $themeStore.language)
    }
  }

  $: formatTime(value)
</script>

<span class="textPadding" style="white-space: nowrap;">
  {time}
</span>
