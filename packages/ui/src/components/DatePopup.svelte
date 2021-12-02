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
  import type { IntlString } from '@anticrm/platform'
  import Label from './Label.svelte'
  import Back from './icons/Back.svelte'
  import Forward from './icons/Forward.svelte'
  import { createEventDispatcher } from 'svelte'

  export let title: IntlString
  export let selected: Date = new Date(Date.now())
  const dispatch = createEventDispatcher()

  let view: Date = selected
  const months: Array<string> = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  let monthYear: string
  let days: Array<number>

  const daysInMonth = (date: Date): number => {
    return 33 - new Date(date.getFullYear(), date.getMonth(), 33).getDate()
  }

  $: {
    monthYear = months[view.getMonth()] + ' ' + view.getFullYear()
    days = []
    for (let i = 1; i <= daysInMonth(view); i++) {
      days.push(new Date(view.getFullYear(), view.getMonth(), i).getDay())
    }
  }
</script>

<div class="popup">
  <div class="flex-col caption-color">
    <div class="title"><Label label={title} /></div>
    <div class="flex-between nav">
      <button
        class="focused-button arrow"
        on:click|preventDefault={() => {
          view.setMonth(view.getMonth() - 1)
          view = view
        }}><div class="icon"><Back size={'small'} /></div></button>
      <div class="monthYear">
        {monthYear}
      </div>
      <button
        class="focused-button arrow"
        on:click|preventDefault={() => {
          view.setMonth(view.getMonth() + 1)
          view = view
        }}><div class="icon"><Forward size={'small'} /></div></button>
    </div>
  </div>

  <div class="calendar">
    <div class="caption">Mo</div>
    <div class="caption">Tu</div>
    <div class="caption">We</div>
    <div class="caption">Th</div>
    <div class="caption">Fr</div>
    <div class="caption">Sa</div>
    <div class="caption">Su</div>
    {#each days as day, i}
      <div
        class="day"
        class:selected={i + 1 === selected.getDate() &&
          view.getMonth() === selected.getMonth() &&
          view.getFullYear() === selected.getFullYear()}
        style="grid-column: {day + 1}/{day + 2};"
        on:click={() => {
          selected = new Date(view.getFullYear(), view.getMonth(), i + 1)
          dispatch('close', selected)
        }}
      >
        {i + 1}
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    max-height: 100%;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    user-select: none;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .35));
  }

  .arrow {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .25rem;
  }

  .title {
    margin-bottom: .75rem;
    font-weight: 500;
    text-align: left;
  }
  .nav {
    min-width: 16.5rem;

    .monthYear {
      margin: 0 1rem;
      line-height: 150%;
      white-space: nowrap;
    }
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: .125rem;
    margin-top: .5rem;

    .caption, .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-content-dark-color);
    }
    .caption {
      font-size: .75rem;
    }
    .day {
      border-radius: .5rem;
      cursor: pointer;

      &.selected {
        background-color: var(--theme-button-bg-focused);
        border: 1px solid var(--theme-bg-accent-color);
        color: var(--theme-caption-color);
      }
    }
  }
</style>
