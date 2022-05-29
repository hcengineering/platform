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
  import { createEventDispatcher } from 'svelte'
  import { dpstore } from '../..'
  import Month from './Month.svelte'
  import Scroller from '../Scroller.svelte'
  import TimeShiftPresenter from '../TimeShiftPresenter.svelte'

  export let direction: 'before' | 'after' = 'after'
  export let minutes: number[] = [5, 15, 30]
  export let hours: number[] = [1, 2, 4, 8, 12]
  export let days: number[] = [1, 3, 7, 30]
  export let shift: boolean = false

  const dispatch = createEventDispatcher()

  const today: Date = new Date(Date.now())
  $: currentDate = $dpstore.currentDate ?? today
  const mondayStart: boolean = true

  $: base = direction === 'before' ? -1 : 1
  const MINUTE = 60 * 1000
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR
  $: values = [
    ...minutes.map((m) => m * MINUTE),
    'divider',
    ...hours.map((m) => m * HOUR),
    'divider',
    ...days.map((m) => m * DAY)
  ]
</script>

<div class="month-popup-container">
  <Month
    bind:currentDate
    {mondayStart}
    on:update={(result) => {
      if (result.detail !== undefined) {
        dispatch('close', result.detail)
      }
    }}
  />
  {#if shift}
    <div class="shift-container">
      <Scroller>
        {#each values as value}
          {#if typeof value === 'number'}
            <div
              class="btn"
              on:click={() => {
                const shiftedDate = new Date(today.getTime() + value * base)
                dispatch('change', shiftedDate)
              }}
            >
              <TimeShiftPresenter value={value * base} />
            </div>
          {:else if value === 'divider'}
            <div class="divider" />
          {/if}
        {/each}
      </Scroller>
    </div>
  {/if}
</div>

<style lang="scss">
  .month-popup-container {
    position: relative;
    background: var(--popup-bg-color);
    border-radius: 0.5rem;
    box-shadow: var(--popup-shadow);

    .shift-container {
      position: absolute;
      display: flex;
      flex-direction: column;
      padding: 0.5rem;
      top: 1rem;
      right: calc(100% - 0.5rem);
      bottom: 1rem;
      width: fit-content;
      width: 12rem;
      min-width: 12rem;
      background: var(--popup-bg-color);
      border: 1px solid var(--divider-color);
      border-radius: 0.5rem;
      box-shadow: var(--popup-shadow);
      z-index: -1;

      .btn {
        flex-shrink: 0;
        margin-right: 0.75rem;
        padding: 0.25rem 0.5rem;
        background-color: transparent;
        border-radius: 0.25rem;
        cursor: pointer;

        &:hover {
          color: var(--caption-color);
          background-color: var(--button-bg-hover);
        }
      }

      .divider {
        margin: 0.25rem 0.75rem 0.25rem 0;
        height: 1px;
        min-height: 1px;
        background-color: var(--divider-color);
      }
    }
  }
</style>
