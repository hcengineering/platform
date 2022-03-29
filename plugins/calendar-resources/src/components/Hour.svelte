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
  import { Event } from '@anticrm/calendar'
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { Tooltip } from '@anticrm/ui'
  import { addZero } from '@anticrm/ui/src/components/calendar/internal/DateUtils'
  import calendar from '../plugin'
  import EventsPopup from './EventsPopup.svelte'

  export let events: Event[]
  export let date: Date

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: string[]

  $: sorted = Array.from(events).sort((a, b) => a.date - b.date)

  function from (eDate: number, date: Date): string {
    const dd = new Date(Math.max(eDate, date.getTime()))
    return `${addZero(date.getHours())}:${addZero(dd.getMinutes())}`
  }

  function to (dueDate: number, date:Date): string {
    return `${addZero(date.getHours())}:${addZero(Math.min(59, Math.floor((dueDate - date.getTime()) / 60000)))}`
  }
</script>

{#if events.length > 0}
  <Tooltip
    fill={true}
    label={calendar.string.Events}
    component={EventsPopup}
    props={{ value: events, _class, query, options, baseMenuClass, config }}
  >
      <div class="cell">
        <div class="flex flex-col flex-grow">
          {#each sorted.slice(0, 4) as e, ei}
            <div class="overflow-label flex flex-between">
              {e.title}
              <div>
                {from(e.date, date)}
                -
                {to(e.dueDate ?? e.date, date)}
              </div>
            </div>
          {/each}
          {#if events.length > 4}
            And {events.length - 4} more
          {/if}
        </div>
      </div>  
  </Tooltip>
{/if}

<style lang="scss">
  .cell {
    padding: 0.5rem;
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    background-color: var(--theme-dialog-accent);
  }
  .title {
    align-self: flex-start;
  }
</style>
