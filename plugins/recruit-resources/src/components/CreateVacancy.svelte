<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import contact, { Organization } from '@anticrm/contact'
  import core, { Ref } from '@anticrm/core'
  import { Card, getClient, UserBox } from '@anticrm/presentation'
  import task, { createKanban, KanbanTemplate } from '@anticrm/task'
  import { Button, Component, createFocusManager, EditBox, FocusHandler } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import Company from './icons/Company.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined
  export let company: Ref<Organization> | undefined
  export let preserveCompany: boolean = false

  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  const client = getClient()

  async function createVacancy () {
    if (
      templateId !== undefined &&
      (await client.findOne(task.class.KanbanTemplate, { _id: templateId })) === undefined
    ) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    const id = await client.createDoc(recruit.class.Vacancy, core.space.Space, {
      name,
      description,
      private: false,
      archived: false,
      company,
      members: []
    })

    await createKanban(client, id, templateId)
    dispatch('close', id)
  }
  const manager = createFocusManager()
</script>

<FocusHandler {manager} />
<Card
  label={recruit.string.CreateVacancy}
  okAction={createVacancy}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={Vacancy} size={'medium'} kind={'link-bordered'} disabled />
    </div>
    <EditBox
      focusIndex={2}
      bind:value={name}
      placeholder={recruit.string.VacancyPlaceholder}
      maxWidth={'37.5rem'}
      kind={'large-style'}
      focus
    />
  </div>
  <svelte:fragment slot="pool">
    <UserBox
      focusIndex={3}
      _class={contact.class.Organization}
      label={recruit.string.Company}
      placeholder={recruit.string.Company}
      justify={'left'}
      bind:value={company}
      allowDeselect
      titleDeselect={recruit.string.UnAssignCompany}
      kind={'no-border'}
      size={'small'}
      icon={Company}
      readonly={preserveCompany}
      showNavigate={false}
      create={{ component: contact.component.CreateOrganization, label: contact.string.CreateOrganization }}
    />
    <Component
      is={task.component.KanbanTemplateSelector}
      props={{
        folders: [recruit.space.VacancyTemplates],
        template: templateId,
        focusIndex: 4
      }}
      on:change={(evt) => {
        templateId = evt.detail
      }}
    />
  </svelte:fragment>
</Card>
