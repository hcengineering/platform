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
  import { DateRangeMode } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import { DAY, DateOrShift, HOUR, MINUTE } from '../types'
  import DateRangePresenter from './calendar/DateRangePresenter.svelte'
  import TimeShiftPresenter from './TimeShiftPresenter.svelte'

  export let direction: 'before' | 'after'
  export let value: DateOrShift | undefined = undefined
  export let minutes: number[] = [5, 15, 30]
  export let hours: number[] = [1, 2, 4]
  export let days: number[] = [1, 3, 7, 30]

  let date = value?.date
  const dispatch = createEventDispatcher()

  $: base = direction === 'before' ? -1 : 1

  $: values = [...minutes.map((m) => m * MINUTE), ...hours.map((m) => m * HOUR), ...days.map((m) => m * DAY)]
</script>

<div class="antiPopup">
  <div class="flex-center mt-1 mb-1">
    <DateRangePresenter
      bind:value={date}
      mode={DateRangeMode.DATETIME}
      editable={true}
      labelNull={ui.string.SelectDate}
      on:change={() => {
        if (date) {
          dispatch('close', { date })
        }
      }}
    />
  </div>
  <div class="bottom-divider mb-2" />
  {#each values as value}
    <div
      class="ap-menuItem"
      on:click={() => {
        dispatch('close', { shift: value })
      }}
    >
      <TimeShiftPresenter value={value * base} />
    </div>
  {/each}
</div>
