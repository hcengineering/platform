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
  import { Label, Loading } from '@hcengineering/ui'
  import { type Integration } from '@hcengineering/account-client'
  import { isWorkspaceIntegration } from '@hcengineering/integration-client'

  import { getIntegrationClient, getAccountClient } from '../utils'
  import aiAssistant from '../plugin'
  import { buildSocialIdString, getCurrentAccount, SocialIdType, type PersonId } from '@hcengineering/core'
  import HulyAssistant from './icons/HulyAssistant.svelte'

  export let integration: Integration | undefined = undefined

  let isLoading = true

  const account = getCurrentAccount()
  const accountClient = getAccountClient()

  onMount(async () => {
    try {
      let socialId = await getSocialId()
      if (socialId == null) {
        socialId = await accountClient.addHulyAssistantSocialId()
      }

      const integrationClient = await getIntegrationClient()
      if (integration === undefined) {
        integration = await integrationClient.connect(socialId)
      }

      integration = isWorkspaceIntegration(integration)
        ? integration
        : await integrationClient.integrate(integration, getCurrentWorkspaceUuid())

      isLoading = false
      dispatch('close')
    } catch (err) {
      isLoading = false
      console.error('Failed to find/create huly assistant social id/integration:', err)
    }
  })

  async function getSocialId (): Promise<PersonId | undefined> {
    const socialKey = buildSocialIdString({
      type: SocialIdType.HULY_ASSISTANT,
      value: account.uuid
    })
    return await accountClient.findSocialIdBySocialKey(socialKey)
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={aiAssistant.string.Configure}
  okAction={async () => {
    dispatch('close')
  }}
  canSave={false}
  fullSize
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      <HulyAssistant size="medium" />
      <span class="text-normal">
        <Label label={aiAssistant.string.Configure} />
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
    {/if}
  </div>
</Card>
