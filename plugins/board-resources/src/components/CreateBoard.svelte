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
  import task, { ProjectType } from '@hcengineering/task'
  import { Component, EditBox, Grid } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'
  import { createBoard } from '../utils/BoardUtils'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let typeId: Ref<ProjectType> | undefined

  export function canClose (): boolean {
    return name === '' && typeId !== undefined
  }

  const client = getClient()

  async function onCreateBoard (): Promise<void> {
    if (typeId === undefined) {
      return
    }
    await createBoard(client, name, description, typeId)
  }
</script>

<SpaceCreateCard
  label={board.string.CreateBoard}
  okAction={onCreateBoard}
  canSave={name.trim().length > 0 && typeId !== undefined}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={board.string.BoardName} bind:value={name} placeholder={board.string.Board} autoFocus />
    <!-- <ToggleWithLabel label={board.string.MakePrivate} description={board.string.MakePrivateDescription} /> -->

    <Component
      is={task.component.ProjectTypeSelector}
      props={{
        categories: [board.category.BoardType],
        type: typeId
      }}
      on:change={(evt) => {
        typeId = evt.detail
      }}
    />
  </Grid>
</SpaceCreateCard>
