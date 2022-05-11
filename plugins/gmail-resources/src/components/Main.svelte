<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Ref, Doc, Class } from '@anticrm/core'
  import contact, { Channel, formatName } from '@anticrm/contact'
  import { SharedMessage } from '@anticrm/gmail'
  import NewMessage from './NewMessage.svelte'
  import FullMessage from './FullMessage.svelte'
  import Chats from './Chats.svelte'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { Panel, Icon, Label, Button, eventToHTMLElement, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import gmail from '../plugin'
  import Connect from './Connect.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>

  // export let object: Contact
  let object: any
  let newMessage: boolean = false
  let currentMessage: SharedMessage | undefined = undefined
  let channel: Channel | undefined = undefined
  const notificationClient = NotificationClientImpl.getClient()
  let enabled: boolean

  const client = getClient()
  const dispatch = createEventDispatcher()

  client
    .findOne(contact.class.Channel, {
      attachedTo: _id,
      provider: contact.channelProvider.Email
    })
    .then((res) => {
      channel = res
    })

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      object = result[0]
    })

  function back () {
    if (newMessage) {
      return (newMessage = false)
    }
    return (currentMessage = undefined)
  }

  async function selectHandler (e: CustomEvent): Promise<void> {
    currentMessage = e.detail
    if (channel !== undefined) {
      await notificationClient.updateLastView(channel._id, channel._class, undefined, true)
    }
  }
</script>

{#if channel && object}
  <Panel
    isHeader={true}
    isAside={false}
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <div class="antiTitle icon-wrapper">
        <div class="wrapped-icon"><Icon icon={contact.icon.Email} size={'medium'} /></div>
        <div class="title-wrapper">
          <span class="wrapped-title">Email</span>
          <span class="wrapped-subtitle">
            <Label label={gmail.string.YouAnd} />
            <b>{formatName(object.name)}</b>
          </span>
        </div>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !enabled}
        <Button
          label={gmail.string.Connect}
          kind={'primary'}
          on:click={(e) => {
            showPopup(Connect, {}, eventToHTMLElement(e))
          }}
        />
      {/if}
    </svelte:fragment>

    {#if newMessage}
      <NewMessage {object} {channel} {currentMessage} on:close={back} />
    {:else if currentMessage}
      <FullMessage {currentMessage} bind:newMessage on:close={back} />
    {:else}
      <Chats {object} {channel} bind:newMessage bind:enabled on:select={selectHandler} />
    {/if}
  </Panel>
{/if}
