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

  import core, { DoneState, Ref, State } from '@anticrm/core'
  import { EditBox, Grid, Dropdown } from '@anticrm/ui'
  import { getClient, SpaceCreateCard } from '@anticrm/presentation'
  import view, { KanbanTemplate } from '@anticrm/view'
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
    const id = await client.createDoc(recruit.class.Vacancy, core.space.Model, {
      name,
      description,
      private: false,
      members: []
    })

    if (templateId === undefined) {
      await client.createDoc(view.class.Kanban, id, {
        attachedTo: id,
        states: [],
        doneStates: await Promise.all([
          client.createDoc(core.class.WonState, id, {
            title: 'Won'
          }),
          client.createDoc(core.class.LostState, id, {
            title: 'Lost'
          })
        ]),
        order: []
      })

      return
    }

    const template = await client.findOne(view.class.KanbanTemplate, { _id: templateId })

    if (template === undefined) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }
    
    const tmplStates = await client.findAll(core.class.State, { _id: { $in: template.states } })
    const states = await Promise.all(
      template.states
        .map((id) => tmplStates.find((x) => x._id === id))
        .filter((tstate): tstate is State => tstate !== undefined)
        .map(async (state) => await client.createDoc(core.class.State, id, { color: state.color, title: state.title }))
    )

    const tmplDoneStates = await client.findAll(core.class.DoneState, { _id: { $in: template.doneStates }})
    const doneStates = await Promise.all(
      template.doneStates
        .map((id) => tmplDoneStates.find((x) => x._id === id))
        .filter((tstate): tstate is DoneState => tstate !== undefined)
        .map(async (state) => await client.createDoc(state._class, id, { title: state.title }))
    )

    await client.createDoc(view.class.Kanban, id, {
      attachedTo: id,
      states,
      doneStates,
      order: []
    })
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
