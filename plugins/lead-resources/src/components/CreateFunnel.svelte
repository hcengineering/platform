<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import core, { getCurrentAccount, Ref } from '@hcengineering/core'
  import presentation, { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import task, { createKanban, KanbanTemplate } from '@hcengineering/task'
  import { Component, EditBox, Grid, IconFolder, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined
  let isPrivate: boolean = false

  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  const client = getClient()

  async function createFunnel (): Promise<void> {
    if (
      templateId !== undefined &&
      (await client.findOne(task.class.KanbanTemplate, { _id: templateId })) === undefined
    ) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    const id = await client.createDoc(lead.class.Funnel, core.space.Space, {
      name,
      description,
      private: isPrivate,
      archived: false,
      members: [getCurrentAccount()._id]
    })

    await createKanban(client, id, templateId)
  }
</script>

<SpaceCreateCard
  label={lead.string.CreateFunnel}
  okAction={createFunnel}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={lead.string.FunnelName}
      icon={IconFolder}
      bind:value={name}
      placeholder={lead.string.FunnelName}
      autoFocus
    />
    <ToggleWithLabel
      label={presentation.string.MakePrivate}
      description={presentation.string.MakePrivateDescription}
      bind:on={isPrivate}
    />

    <Component
      is={task.component.KanbanTemplateSelector}
      props={{
        folders: [lead.space.FunnelTemplates],
        template: templateId
      }}
      on:change={(evt) => {
        templateId = evt.detail
      }}
    />
  </Grid>
</SpaceCreateCard>
