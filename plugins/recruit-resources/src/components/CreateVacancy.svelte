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
  import { EditBox, Grid, Dropdown } from '@anticrm/ui'

  import { getClient, SpaceCreateCard } from '@anticrm/presentation'
  import Company from './icons/Company.svelte'
  import Vacancy from './icons/Vacancy.svelte'

  import recruit from '../plugin'
  import core from '@anticrm/core'
  import view from '@anticrm/view'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  const colors = ['#7C6FCD', '#6F7BC5', '#A5D179', '#77C07B', '#F28469']

  async function createVacancy () {
    const id = await client.createDoc(recruit.class.Vacancy, core.space.Model, {
      name,
      description,
      private: false,
      members: [],
      states: [],
      order: []
    })
    const s1 = await client.createDoc(core.class.State, id, {
      title: 'Initial',
      color: colors[0]
    })
    const s2 = await client.createDoc(core.class.State, id, {
      title: 'Interview 1',
      color: colors[1]
    })
    const s3 = await client.createDoc(core.class.State, id, {
      title: 'Interview 2',
      color: colors[2]
    })
    const s4 = await client.createDoc(core.class.State, id, {
      title: 'Interview 3',
      color: colors[3]
    })
    const s5 = await client.createDoc(core.class.State, id, {
      title: 'Interview 4',
      color: colors[4]
    })
    const s6 = await client.createDoc(core.class.State, id, {
      title: 'Final',
      color: colors[0]
    })
    // await client.updateDoc(recruit.class.Vacancy, core.space.Model, id, {
    // })
    await client.createDoc(view.class.Kanban, id, {
      attachedTo: id,
      states: [s1, s2, s3, s4, s5, s6],
      order: []
    })
  }
</script>

<SpaceCreateCard
  label={recruit.string.CreateVacancy}
  okAction={createVacancy}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={recruit.string.VacancyName}
      bind:value={name}
      icon={Vacancy}
      placeholder="Software Engineer"
      maxWidth="39rem"
      focus
    />
    <Dropdown icon={Company} label={'Company *'} placeholder={'Company'} />
  </Grid>
</SpaceCreateCard>
