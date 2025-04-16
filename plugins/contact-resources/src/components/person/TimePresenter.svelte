<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Icon, Label } from '@hcengineering/ui'

  import contact from '@hcengineering/contact'
  import view from '@hcengineering/view'

  export let timezone: string | undefined
  export let isTimezoneLoading: boolean

  function displayTimeInTimezone (timezone: string): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    }

    const formatter = new Intl.DateTimeFormat([], options)
    const now = new Date()
    return formatter.format(now)
  }
</script>

<div class="time-container">
  <div class="clock-icon">
    <Icon icon={contact.icon.Clock} size={'smaller'} />
  </div>
  <div class="text-normal font-normal content-color select-text">
    {#if isTimezoneLoading}
      <span class="time-text-span"><Label label={view.string.Loading} /></span>
    {:else if timezone != null}
      <span class="time-text-span">{displayTimeInTimezone(timezone)} <Label label={contact.string.LocalTime} /></span>
    {:else}
      <span class="time-text-span"><Label label={contact.string.LocalTimeNotSet} /></span>
    {/if}
  </div>
</div>

<style>
  .clock-icon {
    position: relative;
    color: var(--theme-content-color);
  }

  .time-container {
    justify-content: flex-start;
    align-items: center;
    gap: 0.25rem;
    display: inline-flex;
  }
</style>
