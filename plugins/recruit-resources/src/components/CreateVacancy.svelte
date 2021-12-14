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
  import { createEventDispatcher } from 'svelte'

  import core, { Ref } from '@anticrm/core'
  import { EditBox, Grid, Dropdown } from '@anticrm/ui'
  import { getClient, SpaceCreateCard } from '@anticrm/presentation'
  import view, { KanbanTemplate, createKanban } from '@anticrm/view'
  import { KanbanTemplateSelector } from '@anticrm/view-resources'
  
  import Company from './icons/Company.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  import recruit from '../plugin'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined

  export function canClose(): boolean {
    return name === ''
  }

  const client = getClient()

  async function createVacancy() {
    if (templateId !== undefined && await client.findOne(view.class.KanbanTemplate, { _id: templateId }) === undefined) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    const id = await client.createDoc(recruit.class.Vacancy, core.space.Model, {
      name,
      description,
      private: false,
      members: []
    })

    await createKanban(client, id, templateId)
  }
</script>

<SpaceCreateCard 
  label={recruit.string.CreateVacancy} 
  okAction={createVacancy}
  canSave={name ? true : false}
  on:close={() => { dispatch('close') }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={recruit.string.VacancyName} bind:value={name} icon={Vacancy} placeholder="Software Engineer" maxWidth="39rem" focus/>
    <Dropdown icon={Company} label={'Company *'} placeholder={'Company'} />
    <KanbanTemplateSelector folders={[recruit.space.VacancyTemplates]} bind:template={templateId}/>
  </Grid>
</SpaceCreateCard>
