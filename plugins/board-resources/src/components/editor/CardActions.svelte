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
  import type { Card, CardDate } from '@anticrm/board'
  import board from '@anticrm/board'
  import { getClient } from '@anticrm/presentation'
  import { Button, Label, IconAdd, showPopup } from '@anticrm/ui'
  import { invokeAction } from '@anticrm/view-resources'
  import AddChecklist from '../popups/AddChecklist.svelte'
  import plugin from '../../plugin'
  import { getPopupAlignment } from '../../utils/PopupUtils'
  import UserBoxList from '../UserBoxList.svelte'
  import CardLabels from './CardLabels.svelte'
  import DatePresenter from '../presenters/DatePresenter.svelte'
  import { getCardActions } from '../../utils/CardActionUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'

  export let value: Card
  const client = getClient()

  let dateHandler: (e: Event) => void
  let coverHandler: (e: Event) => void
  function updateDate (e: CustomEvent<CardDate>) {
    client.update(value, { date: e.detail })
  }

  getCardActions(client, {
    _id: { $in: [board.action.Dates, board.action.Cover] }
  }).then(async (result) => {
    for (const action of result) {
      if (action._id === board.action.Dates) {
        dateHandler = (e: Event) => invokeAction(value, e, action.action, action.actionProps)
      }
      if (action._id === board.action.Cover) {
        coverHandler = (e: Event) => invokeAction(value, e, action.action, action.actionProps)
      }
    }
  })
</script>

{#if value}
  <div class="flex-col flex-gap-3">
    <div class="flex-row-stretch flex-gap-1">
      <div class="label">
        <Label label={plugin.string.Members} />
      </div>
      <UserBoxList value={value.members} />
    </div>
    <div class="flex-row-stretch flex-gap-1">
      <div class="label">
        <Label label={plugin.string.Labels} />
      </div>
      <CardLabels {value} />
    </div>
    <div class="flex-row-stretch flex-gap-1">
      <div class="label">
        <Label label={plugin.string.Dates} />
      </div>
      {#key value.date}
        <DatePresenter value={value.date ?? {}} on:click={dateHandler} on:update={updateDate} />
      {/key}
    </div>
    <div class="flex-row-stretch flex-gap-1">
      <div class="label">
        <Label label={plugin.string.Cover} />
      </div>
      {#if !value.cover?.color}
        <Button icon={IconAdd} kind="no-border" on:click={coverHandler} />
      {:else}
        <ColorPresenter value={value.cover.color} on:click={coverHandler} />
      {/if}
    </div>
    <Button
      icon={plugin.icon.Card}
      label={plugin.string.Checklist}
      kind="no-border"
      justify="left"
      on:click={(e) => {
        showPopup(AddChecklist, { value }, getPopupAlignment(e))
      }}
    />
  </div>
{/if}
