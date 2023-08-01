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
  import Scroller from '../Scroller.svelte'
  import TimeShiftPresenter from '../TimeShiftPresenter.svelte'
  import { DAY, HOUR, MINUTE } from '../../types'

  export let currentDate: Date | null
  export let direction: 'before' | 'after' = 'after'
  export let minutes: number[] = [5, 15, 30]
  export let hours: number[] = [1, 2, 4, 8, 12]
  export let days: number[] = [1, 3, 7, 30]
  export let shift: boolean = false
  export let mode: DateRangeMode = DateRangeMode.DATE

  $: withTime = mode !== DateRangeMode.DATE
  $: withDate = mode !== DateRangeMode.TIME

  const dispatch = createEventDispatcher()

  $: base = direction === 'before' ? -1 : 1

  const shiftValues: (number | string)[] = []

  $: {
    if (withTime) {
      shiftValues.push(...minutes.map((m) => m * MINUTE), 'divider', ...hours.map((m) => m * HOUR))
    }
    if (withDate) {
      shiftValues.push('divider', ...days.map((m) => m * DAY))
    }
  }
</script>

{#if shift && currentDate}
  <div class="shift-container">
    <Scroller>
      {#each shiftValues as value}
        {#if typeof value === 'number'}
          {@const numValue = value}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="btn"
            on:click={() => {
              const curr = new Date().setSeconds(0, 0)
              const shiftedDate = new Date(curr + numValue * base)
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

<style lang="scss">
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
    background: var(--theme-navpanel-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    z-index: -1;

    .btn {
      flex-shrink: 0;
      margin-right: 0.75rem;
      padding: 0.25rem 0.5rem;
      background-color: transparent;
      border-radius: 0.25rem;
      cursor: pointer;

      &:hover {
        color: var(--theme-caption-color);
        background-color: var(--theme-navpanel-hovered);
      }
    }

    .divider {
      margin: 0.25rem 0.75rem 0.25rem 0;
      height: 1px;
      min-height: 1px;
      background-color: var(--theme-divider-color);
    }
  }
</style>
