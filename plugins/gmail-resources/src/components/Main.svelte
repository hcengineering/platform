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
  import contact, { Channel, Contact } from '@anticrm/contact'
  import { SharedMessage } from '@anticrm/gmail'
  import NewMessage from './NewMessage.svelte'
  import FullMessage from './FullMessage.svelte'
  import Chats from './Chats.svelte'
  import { getClient } from '@anticrm/presentation'

  export let object: Contact
  let newMessage: boolean = false
  let currentMessage: SharedMessage | undefined = undefined
  let channel: Channel | undefined = undefined

  const client = getClient()

  client.findOne(contact.class.Channel, {
    attachedTo: object._id,
    provider: contact.channelProvider.Email
  }).then((res) => channel = res)

  function back () {
    if (newMessage) {
      return (newMessage = false)
    }
    return (currentMessage = undefined)
  }

  function selectHandler (e: CustomEvent) {
    currentMessage = e.detail
  }
</script>

{#if channel}
  {#if newMessage}
    <NewMessage {object} {channel} {currentMessage} on:close={back} />
  {:else if currentMessage}
    <FullMessage {currentMessage} bind:newMessage on:close={back} />
  {:else}
    <Chats {object} {channel} bind:newMessage on:select={selectHandler} />
  {/if}
{/if}
