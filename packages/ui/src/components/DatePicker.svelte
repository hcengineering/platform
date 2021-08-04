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
  import PopupMenu from './PopupMenu.svelte'
  import Calendar from './icons/Calendar.svelte'
  import Close from './icons/Close.svelte'
  import Back from './icons/Back.svelte'
  import Forward from './icons/Forward.svelte'

  export let title: IntlString
  export let selected: Date = new Date(Date.now())
  export let show: boolean = false

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

<div class="dataPicker">
  <PopupMenu bind:show={show}>
    <button
      slot="trigger"
      class="btn"
      class:selected={show}
      on:click|preventDefault={() => {
        show = !show
      }}
    >
      <div class="icon">
        {#if show}<Close size={'small'} />{:else}<Calendar size={'medium'} />{/if}
      </div>
    </button>

    <div class="header">
      <div class="title"><Label label={title} /></div>
      <div class="nav">
        <button
          class="btn arrow"
          on:click|preventDefault={() => {
            view.setMonth(view.getMonth() - 1)
            view = view
          }}><div class="icon"><Back size={'small'} /></div></button>
        <div class="monthYear">
          {monthYear}
        </div>
        <button
          class="btn arrow"
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
            show = false
          }}
        >
          {i + 1}
        </div>
      {/each}
    </div>
  </PopupMenu>
  <div class="selectDate">
    <div class="title"><Label label={title} /></div>
    <div class="date">
      {selected.getMonth() + 1} / {selected.getDate()} / {selected.getFullYear()}
    </div>
  </div>
</div>

<style lang="scss">
  .dataPicker {
    display: flex;
    flex-wrap: nowrap;

    .btn {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
      width: 36px;
      height: 36px;
      background-color: var(--theme-button-bg-focused);
      border: 1px solid transparent;
      border-radius: 8px;
      outline: none;
      cursor: pointer;

      .icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 20px;
        opacity: 0.3;
      }

      &.arrow {
        width: 32px;
        height: 32px;
        border: 1px solid var(--theme-bg-accent-color);
        border-radius: 4px;

        .icon {
          width: 16px;
          height: 16px;
        }
      }

      &.selected {
        background-color: var(--theme-button-bg-focused);
        border: 1px solid var(--theme-bg-accent-color);
        .icon {
          opacity: 0.6;
        }
      }

      &:hover {
        background-color: var(--theme-button-bg-pressed);
        border: 1px solid var(--theme-bg-accent-color);
        .icon {
          opacity: 1;
        }
      }
      &:focus {
        border: 1px solid var(--primary-button-focused-border);
        box-shadow: 0 0 0 3px var(--primary-button-outline);
        .icon {
          opacity: 1;
        }
      }
    }

    .header {
      display: flex;
      flex-direction: column;
      color: var(--theme-caption-color);

      .title {
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
      }
      .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 264px;

        .monthYear {
          margin: 0 16px;
          line-height: 150%;
          white-space: nowrap;
        }
      }
    }

    .calendar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      margin-top: 8px;

      .caption {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 36px;
        height: 36px;
        font-size: 12px;
        color: var(--theme-content-dark-color);
      }
      .day {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 36px;
        height: 36px;
        font-family: inherit;
        color: var(--theme-content-dark-color);
        border-radius: 8px;
        cursor: pointer;

        &.selected {
          background-color: var(--theme-button-bg-focused);
          border: 1px solid var(--theme-bg-accent-color);
          color: var(--theme-caption-color);
        }
      }
    }

    .selectDate {
      margin-left: 12px;
      .title {
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-content-accent-color);
      }
      .date {
        font-size: 14px;
        color: var(--theme-caption-color);
      }
    }
  }
</style>
