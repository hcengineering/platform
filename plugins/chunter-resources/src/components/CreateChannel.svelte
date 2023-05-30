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
  import { IconFolder, EditBox, ToggleWithLabel, Grid } from '@hcengineering/ui'
  import workbench from '@hcengineering/workbench'
  import presentation, { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'

  import chunter from '../plugin'
  import core, { getCurrentAccount } from '@hcengineering/core'

  const dispatch = createEventDispatcher()

  let isPrivate: boolean = false
  let name: string = ''
  export function canClose (): boolean {
    return name === ''
  }
  const client = getClient()

  async function createChannel () {
    const channelId = await client.createDoc(chunter.class.Channel, core.space.Space, {
      name,
      description: '',
      private: isPrivate,
      archived: false,
      members: [getCurrentAccount()._id]
    })
    const navigate = await getResource(workbench.actionImpl.Navigate)

    await navigate([], undefined as any, {
      mode: 'space',
      space: channelId
    })
  }
</script>

<SpaceCreateCard
  label={chunter.string.CreateChannel}
  okAction={createChannel}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={chunter.string.ChannelName}
      icon={IconFolder}
      bind:value={name}
      placeholder={chunter.string.ChannelNamePlaceholder}
      autoFocus
    />
    <ToggleWithLabel
      label={presentation.string.MakePrivate}
      description={presentation.string.MakePrivateDescription}
      bind:on={isPrivate}
    />
  </Grid>
</SpaceCreateCard>
