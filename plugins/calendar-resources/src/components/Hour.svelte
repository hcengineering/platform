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
  import { getPlatformColorForText, tooltip } from '@anticrm/ui'
  import { areDatesEqual } from '@anticrm/ui/src/components/calendar/internal/DateUtils'
  import { BuildModelKey } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@anticrm/platform'

  export let events: Event[]
  export let date: Date
  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: (string | BuildModelKey)[]

  const dispatch = createEventDispatcher()

  function startCell (eDate: number, date: Date): boolean {
    const event = new Date(eDate)
    return areDatesEqual(event, date) ? event.getHours() === date.getHours() : date.getHours() === 0
  }

  function getTop (e: Event): string {
    return `${(new Date(e.date).getMinutes() / 60) * 100}%`
  }

  function getHeight (e: Event): string {
    if (e.dueDate !== undefined) {
      const duration = areDatesEqual(new Date(e.dueDate), new Date(e.date)) ? e.dueDate - e.date : new Date(e.date).setHours(23, 59) - e.date
      const hourPercent = duration / 10 / 60 / 60
      return `${hourPercent}%`
    }
    return '1rem'
  }
</script>

<div
  class="cursor-pointer w-full h-full"
  on:click={() => {
    dispatch('create', date)
  }}
>
  {#if events.length > 0}
    <div
      class="flex flex-col h-full flex-grow relative"
    >
      {#each events as e, i}
        {#if startCell(e.date, date)}
          <div
            use:tooltip={{
              label: getEmbeddedLabel(e.title)
            }}
            class="overflow-label event"
            style="background-color: {getPlatformColorForText(e._class)}; top: {getTop(e)}; height: {getHeight(
              e
            )}; left: {i * 2.25}rem;"
            on:click|stopPropagation={() => {
              // selected = e._id
            }}
          >
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .event {
    position: absolute;
    border-radius: 0.25rem;
    padding: 0 0.5rem;
    border: 1px solid #00000033;
    width: 2rem;
  }
</style>
