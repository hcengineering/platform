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
  import core, { Data, Ref, Timestamp } from '@hcengineering/core'
  import { Department, PublicHoliday, timeToTzDate } from '@hcengineering/hr'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Button, DateRangePresenter, EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import hr from '../../plugin'
  import DepartmentEditor from '../DepartmentEditor.svelte'

  export let date: Timestamp
  export let department: Ref<Department>

  const client = getClient()
  const dispatch = createEventDispatcher()

  let description: string
  let title: string
  let existingHoliday: PublicHoliday | undefined = undefined

  async function getAncestors (department: Ref<Department>): Promise<Ref<Department>[]> {
    const departments = await client.findAll(hr.class.Department, {})
    const byId = new Map<Ref<Department>, Ref<Department>>()
    for (const doc of departments) {
      byId.set(doc._id, doc.parent ?? hr.ids.Head)
    }

    const ancestors: Ref<Department>[] = []
    let parent: Ref<Department> | undefined = department
    while (parent !== undefined && parent !== hr.ids.Head) {
      parent = byId.get(parent)
      if (parent !== undefined) {
        ancestors.push(parent)
      }
    }
    return ancestors
  }

  async function findHoliday (): Promise<void> {
    const holidays = await client.findAll(hr.class.PublicHoliday, { date: timeToTzDate(date) })

    // look into current department first
    let holiday = holidays.find((p) => p.department === department)
    if (holiday === undefined) {
      // if not found look at parent departments
      const ancestors = await getAncestors(department)
      holiday = holidays.find((p) => ancestors.includes(p.department))
    }

    existingHoliday = holiday
    if (existingHoliday !== undefined) {
      title = existingHoliday.title
      description = existingHoliday.description
      department = existingHoliday.department
    }
  }

  async function saveHoliday (): Promise<void> {
    if (existingHoliday !== undefined) {
      await client.updateDoc(hr.class.PublicHoliday, core.space.Workspace, existingHoliday._id, {
        title,
        description
      })
    } else {
      const holiday: Data<PublicHoliday> = {
        title,
        description,
        date: timeToTzDate(date),
        department
      }
      await client.createDoc(hr.class.PublicHoliday, core.space.Workspace, holiday)
    }
  }

  let loading = true
  void findHoliday().then(() => {
    loading = false
  })

  function deleteHoliday (): void {
    if (existingHoliday !== undefined) {
      void client.remove(existingHoliday)
    }
    dispatch('close')
  }
</script>

<Card
  label={existingHoliday ? hr.string.EditPublicHoliday : hr.string.MarkAsPublicHoliday}
  on:close
  okLabel={existingHoliday ? presentation.string.Save : presentation.string.Ok}
  okAction={() => {
    void saveHoliday()
  }}
  canSave={!loading}
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
      <DepartmentEditor bind:value={department} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    {#if existingHoliday}
      <Button
        label={presentation.string.Remove}
        kind="ghost"
        on:click={() => {
          deleteHoliday()
        }}
      />
    {/if}
  </svelte:fragment>
</Card>
