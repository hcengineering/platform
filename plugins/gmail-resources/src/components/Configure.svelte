<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'

  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import { AccountUuid } from '@hcengineering/core'
  import presentation, { Card, getClient, getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import { Grid, Label, Toggle } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { isWorkspaceIntegration } from '@hcengineering/integration-client'
  import { Integration as AccountIntegration } from '@hcengineering/account-client'

  import ConfigureV2 from './ConfigureV2.svelte'
  import { getIntegrationClient } from '../api'
  import gmail from '../plugin'
  import { isNewGmailIntegration } from '../utils'

  export let integration: AccountIntegration
  let integrationSettings: Integration | undefined
  let shared = false

  const currentEmployee = getCurrentEmployee()
  const client = getClient()

  $: loadSettings(integration)

  async function loadSettings (integration: AccountIntegration): Promise<void> {
    const type = await client.findOne(setting.class.IntegrationType, {
      kind: integration.kind
    })
    integrationSettings = await client.findOne(setting.class.Integration, {
      createdBy: integration.socialId,
      type: type?._id
    })
    shared = (integrationSettings?.shared?.length ?? 0) > 0
  }

  async function change (shared: AccountUuid[]) {
    if (integrationSettings == null) {
      console.error('Integrations settings are not found', integration.socialId, integration.kind)
      return
    }
    integrationSettings.shared = shared
    await client.update(integrationSettings, {
      shared
    })
  }

  async function apply () {
    const integrationClient = await getIntegrationClient()
    integration = isWorkspaceIntegration(integration)
      ? integration
      : await integrationClient.integrate(integration, getCurrentWorkspaceUuid())
  }

  async function disable () {
    if (!shared) {
      await change([])
    }
  }

  const dispatch = createEventDispatcher()
</script>

{#if isNewGmailIntegration(integration)}
  <ConfigureV2 {integration} on:close />
{:else}
  <Card
    label={gmail.string.Shared}
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
    <div style="width: 25rem;">
      <Grid rowGap={1}>
        <div>
          <Label label={gmail.string.Shared} />
        </div>
        <Toggle bind:on={shared} on:change={disable} />
        {#if shared}
          <div>
            <Label label={gmail.string.AvailableTo} />
          </div>
          <AccountArrayEditor
            kind={'regular'}
            label={gmail.string.AvailableTo}
            excludeItems={[currentEmployee]}
            value={integrationSettings?.shared ?? []}
            onChange={(res) => change(res)}
          />
        {/if}
      </Grid>
    </div>
  </Card>
{/if}
