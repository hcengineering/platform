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
  import { Event } from '@hcengineering/calendar'
  import { Ref, TxUpdateDoc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { DateTimePresenter, showPanel } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import calendar from '../../plugin'

  export let tx: TxUpdateDoc<Event>

  const client = getClient()

  async function getEvent (_id: Ref<Event>): Promise<Event | undefined> {
    return await client.findOne(calendar.class.Event, { _id })
  }

  function click (event: Event): void {
    showPanel(view.component.EditDoc, event._id, event._class, 'content')
  }
</script>

<div class="flex">
  {#await getEvent(tx.objectId) then event}
    {#if event}
      <span
        class="over-underline caption-color flex-row-center"
        on:click={() => {
          click(event)
        }}
        >{event.title}
      </span>
      &nbsp
      <DateTimePresenter value={event.date} />
    {/if}
  {/await}
</div>
