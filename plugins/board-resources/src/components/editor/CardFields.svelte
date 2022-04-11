<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Card, CardLabel } from '@anticrm/board'

  import contact, { Employee } from '@anticrm/contact'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Button, CircleButton, IconAdd, Label } from '@anticrm/ui'

  import board from '../../plugin'
  import { getCardActions } from '../../utils/CardActionUtils'
  import { hasDate } from '../../utils/CardUtils'
  import DatePresenter from '../presenters/DatePresenter.svelte'
  import LabelPresenter from '../presenters/LabelPresenter.svelte'
  import MemberPresenter from '../presenters/MemberPresenter.svelte'

  export let value: Card
  const query = createQuery()
  const client = getClient()
  let members: Employee[]
  let labels: CardLabel[]
  let membersHandler: () => void
  let labelsHandler: () => void
  let dateHandler: () => void

  $: value.members &&
    value.members.length > 0 &&
    query.query(contact.class.Employee, { _id: { $in: value.members } }, (result) => {
      members = result
    })

  $: value.labels &&
    value.labels.length > 0 &&
    query.query(board.class.CardLabel, { _id: { $in: value.labels } }, (result) => {
      labels = result
    })

  getCardActions(client, {
    _id: { $in: [board.cardAction.Dates, board.cardAction.Labels, board.cardAction.Members] }
  }).then(async (result) => {
    for (const action of result) {
      if (action.handler) {
        const handler = await getResource(action.handler)
        if (action._id === board.cardAction.Dates) {
          dateHandler = () => handler(value, client)
        } else if (action._id === board.cardAction.Labels) {
          labelsHandler = () => handler(value, client)
        } else if (action._id === board.cardAction.Members) {
          membersHandler = () => handler(value, client)
        }
      }
    }
  })
</script>

{#if value}
  {#if members && members.length > 0}
    <div class="flex-col mt-4">
      <div class="text-md font-medium">
        <Label label={board.string.Members} />
      </div>
      <div class="flex-row-center flex-gap-1">
        {#each members as member}
          <MemberPresenter value={member} size="large" />
        {/each}
        <CircleButton icon={IconAdd} size="large" on:click={membersHandler} />
      </div>
    </div>
  {/if}
  {#if labels && labels.length > 0}
    <div class="flex-col mt-4">
      <div class="text-md font-medium">
        <Label label={board.string.Labels} />
      </div>
      <div class="flex-row-center flex-gap-1">
        {#each labels as label}
          <LabelPresenter value={label} on:click={labelsHandler} />
        {/each}
        <Button icon={IconAdd} size="large" on:click={labelsHandler} />
      </div>
    </div>
  {/if}
  {#if value.date && hasDate(value)}
    <div class="flex-col mt-4">
      <div class="text-md font-medium">
        <Label label={board.string.Labels} />
      </div>
      <DatePresenter value={value.date} on:click={dateHandler} />
    </div>
  {/if}
{/if}
