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
  import { Event } from '@hcengineering/calendar'
  import { Label, addZero } from '@hcengineering/ui'
  import calendar from '../plugin'

  export let event: Event
  export let hideDetails: boolean = false
  export let oneRow: boolean = false
  export let narrow: boolean = false

  $: startDate = new Date(event.date)
  $: endDate = new Date(event.dueDate)

  const getTime = (date: Date): string => {
    return `${addZero(date.getHours())}:${addZero(date.getMinutes())}`
  }
</script>

{#if !narrow}
  {#if !hideDetails}
    <b class="overflow-label">
      {event.title}
    </b>
  {:else}
    <span class="content-dark-color"><Label label={calendar.string.Busy} /></span>
  {/if}
{/if}
{#if !oneRow}
  <span class="overflow-label text-sm">{getTime(startDate)}-{getTime(endDate)}</span>
{/if}
