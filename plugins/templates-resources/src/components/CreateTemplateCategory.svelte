<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import core, { getCurrentAccount } from '@hcengineering/core'
  import presentation, { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import { EditBox, Grid, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import templates from '../plugin'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''
  let isPrivate: boolean = false

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  async function create (): Promise<void> {
    await client.createDoc(templates.class.TemplateCategory, core.space.Space, {
      name,
      description,
      private: isPrivate,
      archived: false,
      members: [getCurrentAccount().uuid]
    })
  }
</script>

<SpaceCreateCard
  label={templates.string.CreateTemplateCategory}
  okAction={create}
  canSave={name.trim().length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={templates.string.TemplateCategory}
      bind:value={name}
      placeholder={templates.string.TemplateCategory}
      autoFocus
    />
    <ToggleWithLabel
      label={presentation.string.MakePrivate}
      description={presentation.string.MakePrivateDescription}
      bind:on={isPrivate}
    />
  </Grid>
</SpaceCreateCard>
