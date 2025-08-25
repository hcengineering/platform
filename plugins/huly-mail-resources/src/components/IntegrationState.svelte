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
  import { onMount, onDestroy } from 'svelte'

  import type { Integration } from '@hcengineering/account-client'
  import { IntegrationEventData, onIntegrationEvent } from '@hcengineering/integration-client'
  import { type GmailSyncState } from '@hcengineering/gmail'
  import { BaseIntegrationState, IntegrationStateRow } from '@hcengineering/setting-resources'

  import gmail from '../plugin'
  import platform, { IntlString, OK, ERROR, Status, Severity } from '@hcengineering/platform'

  export let integration: Integration

  let state: GmailSyncState | null | undefined

  $: email = integration.data?.email
</script>

<BaseIntegrationState isLoading={false} {integration} value={email}>
  <svelte:fragment slot="content">
    {#if state?.isConfigured === true && state?.totalMessages != null}
      <IntegrationStateRow label={gmail.string.TotalMessages} value={state.totalMessages} />
    {/if}
    {#if state?.isConfigured !== true}
      <IntegrationStateRow label={gmail.string.ConfigurationRequired} />
    {/if}
  </svelte:fragment>
</BaseIntegrationState>
