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

  import { translate } from '@anticrm/platform'
  import { ticker } from '..'
  import ui from '../plugin'
  import Tooltip from './Tooltip.svelte'

  export let value: number

  const SECOND = 1000
  const MINUTE = SECOND * 60
  const HOUR = MINUTE * 60
  const DAY = HOUR * 24

  let time: string = ''

  async function formatTime(now: number) {
    let passed = now - value
    if (passed < 0) passed = 0
    if (passed < HOUR) {
      time = await translate(ui.string.Minutes, { minutes: Math.floor(passed / MINUTE) })
    } else if (passed < DAY) {
      time = await translate(ui.string.Hours, { hours: Math.floor(passed / HOUR) })
    } else {
      time = await translate(ui.string.Days, { days: Math.floor(passed / DAY) })
    }
  }

  $: formatTime($ticker)

  $: tooltip = new Date(value).toLocaleString('default', { minute:'2-digit', hour:'numeric', day:'2-digit', month: 'short', year: 'numeric'})

</script>

<Tooltip label={tooltip}>
  <span style="white-space: nowrap;" >{time}</span>
</Tooltip>