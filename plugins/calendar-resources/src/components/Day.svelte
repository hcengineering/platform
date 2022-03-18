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
  import calendar from '../plugin'
  import EventsPopup from './EventsPopup.svelte'

  export let events: Event[]
  export let date: Date
  export let size: 'small' | 'huge' = 'small'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: string[]
</script>

{#if events.length > 0}
  <Tooltip
    fill={size === 'huge'}
    label={calendar.string.Events}
    component={EventsPopup}
    props={{ value: events, _class, query, options, baseMenuClass, config }}
  >
    {#if size === 'huge'}
      <div class="cell" class:huge={size === 'huge'}>
        <div class="flex flex-reverse fs-title flex-grow">
          {date.getDate()}
        </div>
      </div>
      <div class="cell" class:huge={size === 'huge'}>
        <div class="flex-col flex-grow">
          {#each events.slice(0, 4) as e, ei}
            <div class="overflow-label flex flex-between">
              {e.title}
              <div>
                {new Date(e.date).getHours()}:{new Date(e.date).getMinutes()}
              </div>
            </div>
          {/each}
          {#if events.length > 4}
            And {events.length - 4} more
          {/if}
        </div>
      </div>
    {:else}
      <div class="cell">
        {date.getDate()}
        <div class="marker" />
      </div>
    {/if}
  </Tooltip>
{:else if size === 'huge'}
  <!-- <div class="cell" class:huge={size === 'huge'}> -->
    <div class="flex flex-reverse fs-title flex-grow title">
      {date.getDate()}
    </div>
  <!-- </div> -->
{:else}
  <div class="cell">
    {date.getDate()}
  </div>
{/if}

<style lang="scss">
  .cell {
    display: flex;
    flex-grow: 1;
    justify-content: center;

    .marker {
      position: relative;
      top: -0.25rem;
      width: 0.25rem;
      height: 0.25rem;
      border-radius: 50%;
      background-color: var(--highlight-red);
    }
    &.huge {
      padding: 0.25rem;
    }
  }
  .title {
    margin-top: 0.25rem;
    margin-right: 0.25rem;
    align-self: flex-start;
  }
</style>
