<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import presentation, { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { Button, DateRangePresenter, EditBox, Label } from '@hcengineering/ui'
  import hr from '../../plugin'
  import core, { Data, Ref } from '@hcengineering/core'
  import { toTzDate, PublicHoliday, Department } from '@hcengineering/hr'
  import { createEventDispatcher } from 'svelte'

  let description: string
  let title: string
  export let date: Date
  export let department: Ref<Department>
  const client = getClient()
  let existingHoliday: PublicHoliday | undefined = undefined
  const dispatch = createEventDispatcher()

  async function findHoliday () {
    existingHoliday = await client.findOne(hr.class.PublicHoliday, { date: toTzDate(date) })
    if (existingHoliday !== undefined) {
      title = existingHoliday.title
      description = existingHoliday.description
      department = existingHoliday.department
    }
  }

  function saveHoliday () {
    if (existingHoliday !== undefined) {
      client.updateDoc(hr.class.PublicHoliday, core.space.Space, existingHoliday._id, {
        title,
        description
      })
    } else {
      const holiday: Data<PublicHoliday> = {
        title,
        description,
        date: toTzDate(date),
        department
      }
      client.createDoc(hr.class.PublicHoliday, core.space.Space, holiday)
    }
  }
  findHoliday()

  function deleteHoliday () {
    existingHoliday && client.remove(existingHoliday)
    dispatch('close')
  }
</script>

<Card
  label={existingHoliday ? hr.string.EditPublicHoliday : hr.string.MarkAsPublicHoliday}
  on:close
  okLabel={existingHoliday ? presentation.string.Save : presentation.string.Ok}
  okAction={() => saveHoliday()}
  canSave={true}
  on:changeContent
>
  <div class="flex-grow mt-4">
    <EditBox placeholder={hr.string.Title} bind:value={title} kind={'large-style'} autoFocus focusIndex={1} />
  </div>
  <div class="flex-grow mt-4">
    <EditBox placeholder={hr.string.Description} bind:value={description} kind={'large-style'} />
  </div>
  <div class="flex-grow mt-4">
    <DateRangePresenter bind:value={date} />
  </div>
  <svelte:fragment slot="pool">
    <div class="flex-row-center flex-grow flex-gap-3">
      <Label label={hr.string.Department} />
      <SpaceSelector _class={hr.class.Department} label={hr.string.ParentDepartmentLabel} bind:space={department} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    {#if existingHoliday}
      <Button label={presentation.string.Remove} kind="ghost" on:click={() => deleteHoliday()} />
    {/if}
  </svelte:fragment>
</Card>
