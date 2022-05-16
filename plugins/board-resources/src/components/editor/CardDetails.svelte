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
  import type { Card, CardDate } from '@anticrm/board'

  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'

  import board from '../../plugin'
  import { getCardActions } from '../../utils/CardActionUtils'
  import { hasDate } from '../../utils/CardUtils'
  import DatePresenter from '../presenters/DatePresenter.svelte'
  import MembersPresenter from '../presenters/MembersPresenter.svelte'
  import CardLabels from './CardLabels.svelte'

  export let value: Card
  const client = getClient()
  let membersHandler: (e: Event) => void
  let dateHandler: (e: Event) => void

  function updateDate (e: CustomEvent<CardDate>) {
    client.update(value, { date: e.detail })
  }

  getCardActions(client, {
    _id: { $in: [board.cardAction.Dates, board.cardAction.Members] }
  }).then(async (result) => {
    for (const action of result) {
      if (action.handler) {
        const handler = await getResource(action.handler)
        if (action._id === board.cardAction.Dates) {
          dateHandler = (e) => handler(value, client, e)
        } else if (action._id === board.cardAction.Members) {
          membersHandler = (e) => handler(value, client, e)
        }
      }
    }
  })
</script>

{#if value}
  {#if value.members?.length}
    <div class="flex-col mt-4 mr-6">
      <div class="text-md font-medium">
        <Label label={board.string.Members} />
      </div>
      <MembersPresenter object={value} {membersHandler} />
    </div>
  {/if}
  {#if value.labels && value.labels.length > 0}
    <div class="flex-col mt-4 mr-6">
      <div class="text-md font-medium">
        <Label label={board.string.Labels} />
      </div>
      <CardLabels {value} />
    </div>
  {/if}
  {#if value.date && hasDate(value)}
    <div class="flex-col mt-4">
      <div class="text-md font-medium">
        <Label label={board.string.Dates} />
      </div>
      {#key value.date}
        <DatePresenter value={value.date} on:click={dateHandler} on:update={updateDate} />
      {/key}
    </div>
  {/if}
{/if}
