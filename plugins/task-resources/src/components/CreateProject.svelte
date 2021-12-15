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
  import core, { Ref } from '@anticrm/core'
  import { getClient, SpaceCreateCard } from '@anticrm/presentation'
  import { EditBox, Grid, IconFolder, ToggleWithLabel } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import { createKanban, KanbanTemplate } from '@anticrm/task'
  import KanbanTemplateSelector from './kanban/KanbanTemplateSelector.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  async function createProject (): Promise<void> {
    if (templateId !== undefined && await client.findOne(task.class.KanbanTemplate, { _id: templateId }) === undefined) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    const id = await client.createDoc(
      task.class.Project,
      core.space.Model,
      {
        name,
        description,
        private: false,
        members: []
      }
    )

    await createKanban(client, id, templateId)
  }
</script>

<SpaceCreateCard
  label={task.string.CreateProject}
  okAction={createProject}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={task.string.ProjectName} icon={IconFolder} bind:value={name} placeholder={'Project name'} focus />
    <ToggleWithLabel label={task.string.MakePrivate} description={task.string.MakePrivateDescription} />
    <KanbanTemplateSelector folders={[task.space.ProjectTemplates]} bind:template={templateId}/>
  </Grid>
</SpaceCreateCard>
