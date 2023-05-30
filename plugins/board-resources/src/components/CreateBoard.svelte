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
  import { Ref } from '@hcengineering/core'
  import { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import task, { KanbanTemplate } from '@hcengineering/task'
  import { Component, EditBox, Grid, IconFolder } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'
  import { createBoard } from '../utils/BoardUtils'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let templateId: Ref<KanbanTemplate> | undefined

  export function canClose (): boolean {
    return name === '' && templateId !== undefined
  }

  const client = getClient()

  async function onCreateBoard (): Promise<void> {
    if (
      templateId !== undefined &&
      (await client.findOne(task.class.KanbanTemplate, { _id: templateId })) === undefined
    ) {
      throw Error(`Failed to find target kanban template: ${templateId}`)
    }

    await createBoard(client, name, description, templateId)
  }
</script>

<SpaceCreateCard
  label={board.string.CreateBoard}
  okAction={onCreateBoard}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={board.string.BoardName}
      icon={IconFolder}
      bind:value={name}
      placeholder={board.string.Board}
      autoFocus
    />
    <!-- <ToggleWithLabel label={board.string.MakePrivate} description={board.string.MakePrivateDescription} /> -->

    <Component
      is={task.component.KanbanTemplateSelector}
      props={{
        folders: [board.space.BoardTemplates],
        template: templateId
      }}
      on:change={(evt) => {
        templateId = evt.detail
      }}
    />
  </Grid>
</SpaceCreateCard>
