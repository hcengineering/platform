<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import presentation, { Card, getClient, getCurrentWorkspaceUuid, SpaceSelector } from '@hcengineering/presentation'
  import { DropdownLabels, Icon, Label, Loading } from '@hcengineering/ui'
  import { type Integration } from '@hcengineering/account-client'
  import { isWorkspaceIntegration, getIntegrationConfig } from '@hcengineering/integration-client'
  import card from '@hcengineering/card'
  import contact from '@hcengineering/contact'

  import { getIntegrationClient, getAccountClient } from '../utils'
  import hulyMail from '../plugin'
  import core, {
    buildSocialIdString,
    getCurrentAccount,
    Ref,
    SocialIdType,
    Space,
    type PersonId
  } from '@hcengineering/core'
  import HulyMail from './icons/HulyMail.svelte'

  export let integration: Integration | undefined = undefined

  let isLoading = true

  let selectedSpace: Ref<Space> | undefined = undefined
  let personSpace: Ref<Space> | undefined = undefined
  let mailboxItems: Array<{ id: string, label: string }> = []
  let selectedMailbox: string | undefined = undefined

  const client = getClient()
  const accountClient = getAccountClient()

  onMount(async () => {
    try {
      const personSpaceObj = await client.findOne(contact.class.PersonSpace, { members: getCurrentAccount().uuid })
      const integrationSpace =
        integration !== undefined ? (getIntegrationConfig(integration)?.spaceId as Ref<Space>) : undefined
      const mailboxes = await accountClient.getMailboxes()
      mailboxItems = mailboxes.map((mailbox) => ({ id: mailbox.mailbox, label: mailbox.mailbox }))
      personSpace = personSpaceObj?._id
      selectedSpace = integrationSpace ?? personSpace
      isLoading = false
    } catch (err) {
      isLoading = false
      console.error('Failed to find person space:', err)
    }
  })

  async function getSocialId (): Promise<PersonId | undefined> {
    if (selectedMailbox === undefined) {
      return undefined
    }
    const socialKey = buildSocialIdString({
      type: SocialIdType.EMAIL,
      value: selectedMailbox
    })
    return await accountClient.findSocialIdBySocialKey(socialKey)
  }

  async function apply (): Promise<void> {
    if (selectedMailbox === undefined) {
      return
    }
    const integrationClient = await getIntegrationClient()
    const socialId = await getSocialId()
    if (socialId === undefined) {
      return
    }
    if (integration === undefined) {
      integration = await integrationClient.connect(socialId, {
        email: selectedMailbox
      })
    }
    integration = isWorkspaceIntegration(integration)
      ? integration
      : await integrationClient.integrate(integration, getCurrentWorkspaceUuid(), {
        email: selectedMailbox
      })
    await integrationClient.updateConfig(integration, {
      spaceId: selectedSpace
    })
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={hulyMail.string.Configure}
  okAction={async () => {
    await apply()
    dispatch('close')
  }}
  canSave={true}
  fullSize
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      <HulyMail size="medium" />
      <span class="text-normal">
        <Label label={hulyMail.string.Configure} />
      </span>
    </div>
  </svelte:fragment>
  <div class="flex-col min-w-100 flex-gap-4" transition:fade={{ duration: 300 }}>
    {#if isLoading}
      <div class="flex-center">
        <div class="p-5">
          <Loading />
        </div>
      </div>
    {:else if mailboxItems.length === 0}
      <div class="flex-row-center">
        <Label label={hulyMail.string.MailboxesNotConfigured} />
      </div>
      <div class="flex-row-center">
        <Label label={hulyMail.string.ConfigureMailBoxes} />
      </div>
    {:else}
      <div class="flex-between flex-gap-4">
        <Label label={hulyMail.string.Mailbox} />
        <DropdownLabels
          items={mailboxItems}
          bind:selected={selectedMailbox}
          disabled={integration?.data?.email !== undefined}
        />
      </div>
      <div class="flex-between flex-gap-4">
        <Label label={hulyMail.string.ChannelSpace} />
        <SpaceSelector
          _class={core.class.Space}
          query={{
            archived: false,
            members: getCurrentAccount().uuid,
            _class: { $in: [card.class.CardSpace, contact.class.PersonSpace] }
          }}
          label={core.string.Space}
          kind={'regular'}
          size={'medium'}
          justify={'left'}
          autoSelect={false}
          bind:space={selectedSpace}
          width="9rem"
        />
      </div>
    {/if}
  </div>
  <svelte:fragment slot="footer">
    <div class="flex-row-center max-w-80 pr-4">
      {#if personSpace === selectedSpace && mailboxItems.length > 0}
        <Icon size={'small'} icon={contact.icon.Person} />
        <span class="text-sm ml-2">
          <Label label={hulyMail.string.PersonSpaceInfo} />
        </span>
      {:else}
        <Icon size={'small'} icon={contact.icon.Contacts} />
        <span class="text-sm ml-2">
          <Label label={hulyMail.string.SharedSpaceInfo} />
        </span>
      {/if}
    </div>
  </svelte:fragment>
</Card>
