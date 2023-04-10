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
  import contact, { Channel, Contact, getName } from '@hcengineering/contact'
  import { Class, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Message, SharedMessage } from '@hcengineering/gmail'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { getResource } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import templates, { TemplateDataProvider } from '@hcengineering/templates'
  import { Button, eventToHTMLElement, Icon, Label, Panel, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import gmail from '../plugin'
  import Chats from './Chats.svelte'
  import Connect from './Connect.svelte'
  import FullMessage from './FullMessage.svelte'
  import IntegrationSelector from './IntegrationSelector.svelte'
  import NewMessage from './NewMessage.svelte'
  import { convertMessage } from '../utils'
  import { employeeByIdStore } from '@hcengineering/contact-resources'

  export let _id: Ref<Contact>
  export let _class: Ref<Class<Contact>>
  export let message: Message | undefined = undefined

  let object: Contact
  let currentMessage: SharedMessage | undefined = undefined

  let newMessage: boolean = false
  let channel: Channel | undefined = undefined
  const notificationClient = NotificationClientImpl.getClient()
  let integrations: Integration[] = []
  let selectedIntegration: Integration | undefined = undefined

  const channelQuery = createQuery()
  const dispatch = createEventDispatcher()

  $: channelQuery.query(
    contact.class.Channel,
    {
      attachedTo: _id,
      provider: contact.channelProvider.Email
    },
    (res) => {
      channel = res[0]
    }
  )

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

  const settingsQuery = createQuery()
  const me = getCurrentAccount()._id

  let templateProvider: TemplateDataProvider | undefined

  getResource(templates.function.GetTemplateDataProvider).then((p) => {
    templateProvider = p()
  })

  onDestroy(() => {
    templateProvider?.destroy()
  })

  $: templateProvider && selectedIntegration && templateProvider.set(setting.class.Integration, selectedIntegration)

  settingsQuery.query(setting.class.Integration, { type: gmail.integrationType.Gmail, disabled: false }, (res) => {
    integrations = res.filter((p) => p.createdBy === me || p.shared?.includes(me))
    selectedIntegration = integrations.find((p) => p.createdBy === me) ?? integrations[0]
  })

  $: message &&
    channel &&
    object &&
    convertMessage(object, channel, message, $employeeByIdStore).then((p) => (currentMessage = p))
</script>

{#if channel && object}
  <Panel
    isHeader={true}
    isAside={false}
    isFullSize
    on:fullsize
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
            <b>{getName(object)}</b>
          </span>
        </div>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if integrations.length === 0}
        <Button
          label={gmail.string.Connect}
          kind={'primary'}
          on:click={(e) => {
            showPopup(Connect, {}, eventToHTMLElement(e))
          }}
        />
      {:else}
        <Label label={gmail.string.From} />
        <IntegrationSelector bind:selected={selectedIntegration} {integrations} />
      {/if}
    </svelte:fragment>

    {#if newMessage && selectedIntegration}
      <NewMessage {object} {channel} {currentMessage} {selectedIntegration} on:close={back} />
    {:else if currentMessage}
      <FullMessage {currentMessage} bind:newMessage on:close={back} />
    {:else}
      <Chats {object} {channel} bind:newMessage enabled={integrations.length > 0} on:select={selectHandler} />
    {/if}
  </Panel>
{/if}
