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
  import { TextArea, EditBox, Dialog, ToggleWithLabel, Tabs, Section, Grid, IconFile } from '@anticrm/ui'

  import { getClient } from '@anticrm/presentation'
  import Recruiting from './icons/Recruiting.svelte'

  import recruit from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''

  const client = getClient()

  const colors = [
    '#7C6FCD',
    '#6F7BC5',
    '#A5D179',
    '#77C07B',
    '#F28469'
  ]

  async function createVacancy() {
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
    await client.updateDoc(recruit.class.Vacancy, core.space.Model, id, {
      states: [s1, s2, s3, s4, s5, s6]
    })
  }
</script>

<Dialog label={recruit.string.CreateVacancy} 
        okLabel={recruit.string.CreateVacancy} 
        okAction={createVacancy}
        on:close={() => { dispatch('close') }}>
  <Section icon={IconFile} label={'General Information'}>
    <Grid column={1}>
      <EditBox label={recruit.string.VacancyName} bind:value={name} placeholder="Software Engineer" maxWidth="39rem" focus/>
      <TextArea label={recruit.string.VacancyDescription} bind:value={description} placeholder="Start typing..."/>
      <ToggleWithLabel label={recruit.string.MakePrivate} description={recruit.string.MakePrivateDescription}/>
    </Grid>
  </Section>
  <Section icon={Recruiting} label={'Vacancy Members'}>
  </Section>
</Dialog>
