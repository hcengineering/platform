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
  import { ChunterSpace, Channel } from '@anticrm/chunter'
  import type { Class, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { EditBox } from '@anticrm/ui'

  import chunter from '../plugin'
  import EditChannelDescriptionAttachments from './EditChannelDescriptionAttachments.svelte'

  export let _id: Ref<ChunterSpace>
  export let _class: Ref<Class<ChunterSpace>>

  export let channel: ChunterSpace | undefined

  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()

  function onNameChange (ev: Event) {
    const value = (ev.target as HTMLInputElement).value
    if (value.trim().length > 0) {
      client.updateDoc(_class, channel!.space, channel!._id, { name: value })
    } else {
      // Just refresh value
      query.query(chunter.class.ChunterSpace, { _id }, (result) => {
        channel = result[0]
      })
    }
  }

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
    const newDescription = (ev.target as HTMLInputElement).value
    client.update(channel!, { description: newDescription })
  }
</script>

{#if channel}
  <div class="flex-col flex-gap-3">
    {#if isCommonChannel(channel)}
      <EditBox
        label={clazz.label}
        icon={clazz.icon}
        bind:value={channel.name}
        placeholder={clazz.label}
        maxWidth="39rem"
        focus
        on:change={onNameChange}
      />
      <EditBox
        label={chunter.string.Topic}
        bind:value={channel.topic}
        placeholder={chunter.string.Topic}
        maxWidth="39rem"
        focus
        on:change={onTopicChange}
      />
      <EditBox
        label={chunter.string.ChannelDescription}
        bind:value={channel.description}
        placeholder={chunter.string.ChannelDescription}
        maxWidth="39rem"
        focus
        on:change={onDescriptionChange}
      />
    {/if}
    <EditChannelDescriptionAttachments {channel} />
  </div>
{/if}
