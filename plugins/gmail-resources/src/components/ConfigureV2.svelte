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
  import { Icon, Label, Loading } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'
  import { isWorkspaceIntegration, getIntegrationConfig } from '@hcengineering/integration-client'
  import card from '@hcengineering/card'
  import contact from '@hcengineering/contact'

  import { getIntegrationClient, startSync } from '../api'
  import gmail from '../plugin'
  import core, { getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import GmailColor from './icons/GmailColor.svelte'

  export let integration: Integration

  let isLoading = true

  let selectedSpace: Ref<Space> | undefined = undefined
  let personSpace: Ref<Space> | undefined = undefined

  const client = getClient()

  onMount(async () => {
    try {
      const personSpaceObj = await client.findOne(contact.class.PersonSpace, { members: getCurrentAccount().uuid })
      const integrationSpace = getIntegrationConfig(integration)?.spaceId as Ref<Space>
      personSpace = personSpaceObj?._id
      selectedSpace = integrationSpace ?? personSpace
      isLoading = false
    } catch (err) {
      isLoading = false
      console.error('Failed to find person space:', err)
    }
  })

  async function apply (): Promise<void> {
    const integrationClient = await getIntegrationClient()
    integration = isWorkspaceIntegration(integration)
      ? integration
      : await integrationClient.integrate(integration, getCurrentWorkspaceUuid())
    await integrationClient.updateConfig(integration, {
      spaceId: selectedSpace
    })
    await startSync(integration.socialId)
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={gmail.string.Configure}
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
      <GmailColor size="medium" />
      <span class="text-normal">
        <Label label={gmail.string.Configure} />
      </span>
    </div>
  </svelte:fragment>
  <div class="flex-col min-w-100" transition:fade={{ duration: 300 }}>
    {#if isLoading}
      <div class="flex-center">
        <div class="p-5">
          <Loading />
        </div>
      </div>
    {:else}
      <div class="flex-between flex-gap-4">
        <Label label={gmail.string.GmailSpace} />
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
      {#if personSpace === selectedSpace}
        <Icon size={'small'} icon={contact.icon.Person} />
        <span class="text-sm ml-2">
          <Label label={gmail.string.PersonSpaceInfo} />
        </span>
      {:else}
        <Icon size={'small'} icon={contact.icon.Contacts} />
        <span class="text-sm ml-2">
          <Label label={gmail.string.SharedSpaceInfo} />
        </span>
      {/if}
    </div>
  </svelte:fragment>
</Card>
