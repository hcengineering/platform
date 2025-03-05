<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Channel, ChunterSpace } from '@hcengineering/chunter'
  import { getCurrentAccount } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import chunter from '../plugin'
  import EditChannelDescriptionAttachments from './EditChannelDescriptionAttachments.svelte'

  export let channel: ChunterSpace

  const client = getClient()
  const dispatch = createEventDispatcher()

  function isCommonChannel (channel?: ChunterSpace): channel is Channel {
    return channel?._class === chunter.class.Channel
  }

  function onTopicChange (ev: Event) {
    if (!isCommonChannel(channel)) {
      return
    }
    const newTopic = (ev.target as HTMLInputElement).value
    client.update(channel, { topic: newTopic })
  }

  function onDescriptionChange (ev: Event) {
    if (channel == null) {
      return
    }
    const newDescription = (ev.target as HTMLInputElement).value
    client.update(channel, { description: newDescription })
  }

  async function leaveChannel (): Promise<void> {
    await client.update(channel, {
      $pull: { members: getCurrentAccount().uuid }
    })
    dispatch('close')
  }
</script>

{#if channel}
  <div class="flex-col flex-gap-3">
    {#if isCommonChannel(channel)}
      <EditBox
        label={chunter.string.Topic}
        bind:value={channel.topic}
        placeholder={chunter.string.Topic}
        autoFocus
        on:change={onTopicChange}
      />
      <EditBox
        label={chunter.string.ChannelDescription}
        bind:value={channel.description}
        placeholder={chunter.string.ChannelDescription}
        on:change={onDescriptionChange}
      />
      <Button
        label={chunter.string.LeaveChannel}
        justify={'left'}
        size={'x-large'}
        on:click={() => {
          leaveChannel()
        }}
      />
    {/if}
    <EditChannelDescriptionAttachments {channel} />
  </div>
{/if}
