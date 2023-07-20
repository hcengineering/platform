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
  import { MILLISECONDS_IN_MINUTE, addZero, showPanel, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import EventPresenter from './EventPresenter.svelte'

  export let event: Event
  export let allday: boolean = false
  export let width: number = 0

  $: startDate = new Date(event.date)
  $: endDate = new Date(event.dueDate)
  $: oneRow = event.dueDate - event.date <= MILLISECONDS_IN_MINUTE * 30 || allday
  $: narrow = event.dueDate - event.date < MILLISECONDS_IN_MINUTE * 25
  $: empty = width < 44

  const getTime = (date: Date): string => {
    return `${addZero(date.getHours())}:${addZero(date.getMinutes())}`
  }
</script>

{#if event}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="event-container"
    class:oneRow
    class:empty
    use:tooltip={{ component: EventPresenter, props: { value: event } }}
    on:click|stopPropagation={() => {
      if (event) showPanel(view.component.EditDoc, event._id, event._class, 'content')
    }}
  >
    {#if !narrow && !empty}
      <b class="overflow-label">{event.title}</b>
    {/if}
    {#if !oneRow && !empty}
      <span class="overflow-label text-sm">{getTime(startDate)}-{getTime(endDate)}</span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .event-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    font-size: 0.8125rem;
    background-color: #f3f6fb;
    border: 1px solid rgba(43, 81, 144, 0.2);
    border-left: 0.25rem solid #2b5190;
    border-radius: 0.25rem;
    cursor: pointer;

    &:not(.oneRow, .empty) {
      padding: 0.25rem 0.5rem 0.25rem 1rem;
    }
    &.oneRow:not(.empty) {
      justify-content: center;
      padding: 0 0.25rem 0 1rem;
    }
  }
</style>
