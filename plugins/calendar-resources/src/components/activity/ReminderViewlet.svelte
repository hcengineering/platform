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
  import { Event,Reminder } from '@anticrm/calendar'
  import { Ref,TxMixin } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { DateTimePresenter,showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'
  import calendar from '../../plugin'

  export let tx: TxMixin<Event, Reminder>

  const client = getClient()

  async function getEvent (_id: Ref<Event>): Promise<Event | undefined> {
    return await client.findOne(calendar.class.Event, { _id })
  }

  function click (event: Event): void {
    showPanel(view.component.EditDoc, event._id, event._class, 'full')
  }
</script>

<div class='flex'>
  {#await getEvent(tx.objectId) then event}
    {#if event}
      <span class="over-underline caption-color" on:click={() => { click(event) }}>{event.title}</span>&nbsp
      <DateTimePresenter value={new Date(event.date)} />
    {/if}
  {/await}
</div>
