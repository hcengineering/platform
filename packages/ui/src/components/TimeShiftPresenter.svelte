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
  import ui from '../plugin'
  import { themeStore } from '@hcengineering/theme'
  import { DAY, HOUR, MINUTE } from '../types'

  export let value: number
  export let exact: boolean = false

  let time: string = ''

  async function formatTime (value: number) {
    if (value > 0) {
      if (exact) {
        const d = Math.floor(value / DAY)
        time = d ? await translate(ui.string.DaysShort, { value: d }, $themeStore.language) : ''
        const h = Math.floor((value - d * DAY) / HOUR)
        time += h ? ` ${await translate(ui.string.HoursShort, { value: h }, $themeStore.language)}` : ''
        const m = Math.floor((value - d * DAY - h * HOUR) / MINUTE)
        time += m ? ` ${await translate(ui.string.MinutesShort, { value: m }, $themeStore.language)}` : ''
      } else {
        if (value < HOUR) {
          time = await translate(ui.string.MinutesAfter, { minutes: Math.floor(value / MINUTE) }, $themeStore.language)
        } else if (value < DAY) {
          time = await translate(ui.string.HoursAfter, { hours: Math.floor(value / HOUR) }, $themeStore.language)
        } else {
          time = await translate(ui.string.DaysAfter, { days: Math.floor(value / DAY) }, $themeStore.language)
        }
      }
    } else {
      const abs = Math.abs(value)
      if (abs < HOUR) {
        time = await translate(ui.string.MinutesBefore, { minutes: Math.floor(abs / MINUTE) }, $themeStore.language)
      } else if (abs < DAY) {
        time = await translate(ui.string.HoursBefore, { hours: Math.floor(abs / HOUR) }, $themeStore.language)
      } else {
        time = await translate(ui.string.DaysBefore, { days: Math.floor(abs / DAY) }, $themeStore.language)
      }
    }
  }

  $: formatTime(value)
</script>

<span style="white-space: nowrap;">{time}</span>
