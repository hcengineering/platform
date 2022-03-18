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
  import { Tooltip } from '@anticrm/ui'
  import calendar from '../plugin'
  import EventsPopup from './EventsPopup.svelte'

  export let events: Event[]
  export let date: Date
  export let size: 'small' | 'huge' = 'small'
</script>

{#if events.length > 0}
  <Tooltip label={calendar.string.Events} component={EventsPopup} props={{ value: events }}>
    <div class="cell" class:huge={size === 'huge'}>
      {date.getDate()}
      <div class="marker" />
    </div>
  </Tooltip>
{:else}
  {date.getDate()}
{/if}

<style lang="scss">
  .marker {
    // position: relative;
    top: -0.25rem;
    width: 0.25rem;
    height: 0.25rem;
    border-radius: 50%;
    background-color: var(--highlight-red);
  }
  .huge {
    width: 5rem;
  }
  .cell {
    display: flex;
    flex-grow: 1;
    justify-content: center;
  }
</style>
