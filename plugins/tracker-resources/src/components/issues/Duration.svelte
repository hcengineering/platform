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
  import { translateCB } from '@hcengineering/platform'
  import ui, { DAY, HOUR, MINUTE, MONTH, YEAR, themeStore } from '@hcengineering/ui'

  export let value: number

  let time: string = ''

  function formatTime (passed: number): void {
    if (passed < 0) passed = 0
    if (passed < HOUR) {
      translateCB(ui.string.Minutes, { minutes: Math.floor(passed / MINUTE) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < DAY) {
      translateCB(ui.string.Hours, { hours: Math.floor(passed / HOUR) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < MONTH) {
      translateCB(ui.string.Days, { days: Math.floor(passed / DAY) }, $themeStore.language, (res) => {
        time = res
      })
    } else if (passed < YEAR) {
      translateCB(ui.string.Months, { months: Math.floor(passed / MONTH) }, $themeStore.language, (res) => {
        time = res
      })
    } else {
      translateCB(ui.string.Years, { years: Math.floor(passed / YEAR) }, $themeStore.language, (res) => {
        time = res
      })
    }
  }

  $: formatTime(value)
</script>

<span class="textPadding" style="white-space: nowrap;">
  {time}
</span>
