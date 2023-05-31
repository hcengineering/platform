<!--
// Copyright © 2022 Anticrm Platform Contributors.
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

  import { getClient, Card } from '@hcengineering/presentation'
  import { DirectMessage } from '@hcengineering/chunter'
  import workbench from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'
  import { EditBox, IconFolder } from '@hcengineering/ui'

  import chunter from '../plugin'

  export let dm: DirectMessage

  let name = ''

  const dispatch = createEventDispatcher()

  async function convertDmToPrivateChannel () {
    const client = getClient()

    await client.updateDoc(dm._class, dm.space, dm._id, {
      _class: chunter.class.Channel,
      name
    } as any)

    const navigate = await getResource(workbench.actionImpl.Navigate)

    await navigate([], undefined as any, {
      mode: 'space',
      space: dm.space
    })

    await navigate([], undefined as any, {
      mode: 'space',
      space: dm._id
    })
  }
</script>

<Card
  label={chunter.string.ConvertToPrivate}
  okLabel={chunter.string.ConvertToPrivate}
  okAction={convertDmToPrivateChannel}
  canSave={!!name}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <EditBox
    label={chunter.string.ChannelName}
    icon={IconFolder}
    bind:value={name}
    placeholder={chunter.string.ChannelNamePlaceholder}
    autoFocus
  />
</Card>
