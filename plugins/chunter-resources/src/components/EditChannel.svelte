<!--
//
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
  
  import { Attachments } from '@anticrm/attachment-resources';
  import { Channel } from '@anticrm/chunter';
  import type { Class, Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery, getClient, Members } from '@anticrm/presentation'
  import { EditBox, Icon, IconClose, Label, ActionIcon, Scroller } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'

  export let _id: Ref<Channel>
  export let _class: Ref<Class<Channel>>

  let channel: Channel

  const dispatch = createEventDispatcher()

  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()
  $: query.query(chunter.class.Channel, { _id }, result => { channel = result[0] })

  const tabLabels: IntlString[] = [chunter.string.Channel, chunter.string.Members]
  let selectedTabIndex = 0

  function onNameChange (ev: Event) {
    const value = (ev.target as HTMLInputElement).value
    if (value.trim().length > 0) {
      client.updateDoc(_class, channel.space, channel._id, { name: value })
    } else {
      // Just refresh value
      query.query(chunter.class.Channel, { _id }, result => { channel = result[0] })
    }
  }

  function onTopicChange (ev: Event) {
    const newTopic = (ev.target as HTMLInputElement).value
    client.updateDoc(_class, chunter.space.Topic, channel._id, { topic: newTopic })
  }

  function onDescriptionChange (ev: Event) {
    const newDescription = (ev.target as HTMLInputElement).value
    client.updateDoc(_class, chunter.space.Description, channel._id, { description: newDescription })
  }

</script>

<div class="antiOverlay" on:click={() => { dispatch('close') }}/>
<div class="antiDialogs antiComponent">
  <div class="ac-header short mirror divide">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon">{#if (clazz.icon)}<Icon icon={clazz.icon} size={'medium'} />{/if}</div>
      <div class="ac-header__title"><Label label={clazz.label} /></div>
    </div>
    <div class="tool"><ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} /></div>
  </div>
  <div class="ac-tabs">
    {#each tabLabels as tabLabel, i}
      <div class="ac-tabs__tab" class:selected={i === selectedTabIndex}
           on:click={() => { selectedTabIndex = i }}>
        <Label label={tabLabel} />
      </div>
    {/each}
    <div class="ac-tabs__empty" />
  </div>
  <Scroller padding>
    {#if selectedTabIndex === 0}
      <!-- Channel description -->
      {#if channel}
        <div class="flex-col flex-gap-3">
          <EditBox label={clazz.label} icon={clazz.icon} bind:value={channel.name} placeholder={clazz.label} maxWidth="39rem" focus on:change={onNameChange}/>
          <EditBox label={chunter.string.Topic} bind:value={channel.topic} placeholder={chunter.string.Topic} maxWidth="39rem" focus on:change={onTopicChange}/>
          <EditBox label={chunter.string.ChannelDescription} bind:value={channel.description} placeholder={chunter.string.ChannelDescription} maxWidth="39rem" focus on:change={onDescriptionChange}/>
          <Attachments objectId={channel._id} _class={channel._class} space={channel.space} />
        </div>
      {/if}
    {:else}
      <!-- Channel members -->
      <Members />
    {/if}
  </Scroller>
</div>
