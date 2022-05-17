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

  import contact, { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { createQuery, getClient, UsersPopup } from '@anticrm/presentation'
  import { Button, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { invokeAction } from '@anticrm/view-resources'

  import board from '../../plugin'
  import { getCardActions } from '../../utils/CardActionUtils'
  import { hasDate, updateCardMembers } from '../../utils/CardUtils'
  import { getPopupAlignment } from '../../utils/PopupUtils'
  import DatePresenter from '../presenters/DatePresenter.svelte'
  import MemberPresenter from '../presenters/MemberPresenter.svelte'
  import CardLabels from './CardLabels.svelte'

  export let value: Card
  const query = createQuery()
  const client = getClient()
  let members: Employee[] = []
  const membersHandler = (e?: Event) => {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        multiSelect: true,
        allowDeselect: true,
        selectedUsers: members?.map((m) => m._id) ?? [],
        placeholder: board.string.SearchMembers
      },
      getPopupAlignment(e),
      undefined,
      (result: Array<Ref<Employee>>) => {
        updateCardMembers(value, client, result)
      }
    )
  }
  let dateHandler: (e: Event) => void

  $: membersIds = members?.map((m) => m._id) ?? []

  const getMenuItems = (member: Employee) => {
    return [
      [
        {
          title: board.string.RemoveFromCard,
          handler: () => {
            const newMembers = membersIds.filter((m) => m !== member._id)
            updateCardMembers(value, client, newMembers)
          }
        }
      ]
    ]
  }

  $: query.query(contact.class.Employee, { _id: { $in: value.members } }, (result) => {
    members = result
  })

  function updateDate (e: CustomEvent<CardDate>) {
    client.update(value, { date: e.detail })
  }

  getCardActions(client, {
    _id: { $in: [board.action.Dates] }
  }).then(async (result) => {
    for (const action of result) {
      if (action._id === board.action.Dates) {
        dateHandler = (e: Event) => invokeAction(value, e, action.action, action.actionProps)
      }
    }
  })
</script>

{#if value}
  {#if members && members.length > 0}
    <div class="flex-col mt-4 mr-6">
      <div class="text-md font-medium">
        <Label label={board.string.Members} />
      </div>
      <div class="flex-row-center flex-gap-1">
        {#each members as member}
          <MemberPresenter value={member} size="large" menuItems={getMenuItems(member)} />
        {/each}
        <Button icon={IconAdd} shape="circle" kind="no-border" size="large" on:click={membersHandler} />
      </div>
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
