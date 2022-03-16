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
  import { Organization } from '@anticrm/contact'
  import core, { Ref } from '@anticrm/core'
  import { getClient,SpaceCreateCard } from '@anticrm/presentation'
  import task, { createKanban,KanbanTemplate } from '@anticrm/task'
  import { Component,EditBox,Grid } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import CompanyDropdown from './CompanyDropdown.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined
  let company: Ref<Organization> | undefined

  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  const client = getClient()

  async function createVacancy () {
    if (templateId !== undefined && await client.findOne(task.class.KanbanTemplate, { _id: templateId }) === undefined) {
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
  }
</script>

<SpaceCreateCard 
  label={recruit.string.CreateVacancy} 
  okAction={createVacancy}
  canSave={!!name}
  on:close={() => { dispatch('close') }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={recruit.string.VacancyName} bind:value={name} icon={Vacancy} placeholder={recruit.string.VacancyPlaceholder} maxWidth={'16rem'} focus/>
    <CompanyDropdown bind:value={company} />

    <Component is={task.component.KanbanTemplateSelector} props={{
      folders: [recruit.space.VacancyTemplates],
      template: templateId
    }} on:change={(evt) => {
      templateId = evt.detail
    }}/>
  </Grid>
</SpaceCreateCard>
