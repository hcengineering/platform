<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import Month from './Month.svelte'
  import Shifts from './Shifts.svelte'

  export let direction: 'before' | 'after' = 'after'
  export let minutes: number[] = [5, 15, 30]
  export let hours: number[] = [1, 2, 4, 8, 12]
  export let days: number[] = [1, 3, 7, 30]
  export let shift: boolean = false
  export let mode: DateRangeMode = DateRangeMode.DATE

  const dispatch = createEventDispatcher()

  const today = new Date(Date.now())
  const startDate = new Date(0)

  $: defaultDate =
    mode === DateRangeMode.TIME
      ? new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        today.getHours(),
        today.getMinutes()
      )
      : today
  $: currentDate = defaultDate
  const mondayStart: boolean = true
</script>

<div class="month-popup-container">
  {#if mode !== DateRangeMode.TIME}
    <Month
      bind:currentDate
      {mondayStart}
      on:update={(result) => {
        if (result.detail !== undefined) {
          dispatch('close', result.detail)
        }
      }}
    />
  {/if}
  <Shifts
    {currentDate}
    on:change={(evt) => (currentDate = evt.detail)}
    {direction}
    {days}
    {minutes}
    {hours}
    {shift}
    {mode}
  />
</div>

<style lang="scss">
  .month-popup-container {
    position: relative;
    background: var(--popup-bg-color);
    border-radius: 0.5rem;
    box-shadow: var(--popup-shadow);
  }
</style>
