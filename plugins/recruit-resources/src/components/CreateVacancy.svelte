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
  import { TextArea, EditBox, Dialog, ToggleWithLabel, Tabs, Section, Grid } from '@anticrm/ui'

  import { getClient } from '@anticrm/presentation'
  import File from './icons/File.svelte'
  import Recruiting from './icons/Recruiting.svelte'

  import recruit from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''

  const client = getClient()

  function createVacancy() {
    client.createDoc(recruit.class.Vacancy, core.space.Model, {
      name,
      description,
      private: false,
      members: []
    })
  }
</script>

<Dialog label={recruit.string.CreateVacancy} 
        okLabel={recruit.string.CreateVacancy} 
        okAction={createVacancy}
        on:close={() => { dispatch('close') }}>
  <Tabs/>
  <Section icon={File} label={'General Information'}>
    <Grid column={1}>
      <EditBox label={recruit.string.VacancyName} bind:value={name} placeholder="Software Engineer" focus/>
      <TextArea label={recruit.string.VacancyDescription} bind:value={description} placeholder="Start typing..."/>
      <ToggleWithLabel label={recruit.string.MakePrivate} description={recruit.string.MakePrivateDescription}/>
    </Grid>
  </Section>
  <Section icon={Recruiting} label={'Vacancy Members'}>
  </Section>
</Dialog>
