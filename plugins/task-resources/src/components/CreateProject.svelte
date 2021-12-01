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
  import { IconFolder, EditBox, ToggleWithLabel, Grid } from '@anticrm/ui'

  import { getClient, SpaceCreateCard } from '@anticrm/presentation'

  import task from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  function createProject () {
    client.createDoc(task.class.Project, core.space.Model, {
      name,
      description,
      private: false,
      members: []
    })
  }
</script>

<SpaceCreateCard
  label={task.string.CreateProject} 
  okAction={createProject}
  canSave={name.length > 0}
  on:close={() => { dispatch('close') }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={task.string.ProjectName} icon={IconFolder} bind:value={name} placeholder={'Project name'} focus/>
    <ToggleWithLabel label={task.string.MakePrivate} description={task.string.MakePrivateDescription}/>
  </Grid>
</SpaceCreateCard>
