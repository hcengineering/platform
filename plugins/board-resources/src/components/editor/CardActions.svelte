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
  import type { Card } from '@anticrm/board'
  import board from '@anticrm/board'
  import { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import ui, { Button, CheckBox, DateRangePresenter, Label, IconAdd } from '@anticrm/ui'
  import { invokeAction } from '@anticrm/view-resources'

  import plugin from '../../plugin'
  import { getCardActions } from '../../utils/CardActionUtils'
  import { updateCardMembers } from '../../utils/CardUtils'
  import ColorPresenter from '../presenters/ColorPresenter.svelte'
  import UserBoxList from '../UserBoxList.svelte'
  import CardLabels from './CardLabels.svelte'

  export let value: Card
  const client = getClient()

  let coverHandler: (e: Event) => void

  function updateMembers (e: CustomEvent<Ref<Employee>[]>) {
    updateCardMembers(value, client, e.detail)
  }
  function updateState (e: CustomEvent<boolean>) {
    if (e.detail) {
      client.update(value, { doneState: board.state.Completed })
    } else {
      client.update(value, { doneState: null })
    }
  }

  getCardActions(client, {
    _id: { $in: [board.action.Cover] }
  }).then(async (result) => {
    for (const action of result) {
      if (action._id === board.action.Cover) {
        coverHandler = (e: Event) => invokeAction(value, e, action.action, action.actionProps)
      }
    }
  })
</script>

{#if value}
  <div class="flex-col flex-gap-3 mt-4">
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={plugin.string.Completed} />
      </div>
      <CheckBox checked={value.doneState === board.state.Completed} on:value={updateState} />
    </div>
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={plugin.string.Members} />
      </div>
      <UserBoxList value={value.members ?? []} on:update={updateMembers} />
    </div>
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={plugin.string.Labels} />
      </div>
      <CardLabels {value} />
    </div>
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={ui.string.StartDate} />
      </div>
      <DateRangePresenter
        value={value.startDate}
        editable={true}
        withTime={false}
        on:change={(e) => {
          console.log(e)
          client.update(value, { startDate: e.detail })
        }}
      />
    </div>
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={ui.string.DueDate} />
      </div>
      <DateRangePresenter
        value={value.dueDate}
        editable={true}
        withTime={false}
        on:change={(e) => client.update(value, { dueDate: e.detail })}
      />
    </div>
    <div class="flex-row-stretch flex-gap-1 items-center">
      <div class="label w-24">
        <Label label={plugin.string.Cover} />
      </div>
      {#if !value.cover?.color}
        <Button icon={IconAdd} kind="no-border" on:click={coverHandler} />
      {:else}
        <ColorPresenter value={value.cover.color} on:click={coverHandler} />
      {/if}
    </div>
  </div>
{/if}
