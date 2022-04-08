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

import { Channel } from '@anticrm/chunter';
  import type { Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { showPanel } from '@anticrm/ui'
  import chunter from '../plugin'
  import { classIcon } from '../utils'
  import Header from './Header.svelte'

  export let spaceId: Ref<Channel> | undefined

  const client = getClient()
  const query = createQuery()
  let channel: Channel | undefined

  $: query.query(chunter.class.Channel, { _id: spaceId }, (result) => {
    channel = result[0]
  })

  async function onSpaceEdit (): Promise<void> {
    if (channel === undefined) return
    showPanel(chunter.component.EditChannel, channel._id, channel._class, 'right')
  }
</script>

<div class="ac-header divide full">
  {#if channel}
    <Header
      icon={classIcon(client, channel._class)}
      label={channel.name}
      description={channel.topic}
      on:click={onSpaceEdit}
    />
  {/if}
</div>
