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
  import { getState } from '../api'
  import platform, { IntlString, OK, ERROR, Status, Severity } from '@hcengineering/platform'

  export let integration: Integration

  let isLoading = true
  let error: string | null = null
  let errorLabel: IntlString | undefined
  let status: Status | undefined
  let state: GmailSyncState | null | undefined

  const unsubscribers: (() => void)[] = []

  onMount(async () => {
    try {
      state = await getState(integration.socialId)
      isLoading = false
      subscribe()
      status = state?.status === 'inactive' ? new Status(Severity.WARNING, platform.status.OK, {}) : OK
    } catch (err) {
      status = ERROR
      error = err instanceof Error ? err.message : 'Failed to load gmail state'
      if (error.includes('Failed to fetch')) {
        errorLabel = gmail.string.FailedToConnect
      }
      isLoading = false
      console.error('Error loading gmail state:', err)
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((unsubscribe) => {
      unsubscribe()
    })
  })

  function subscribe (): void {
    unsubscribers.push(onIntegrationEvent<IntegrationEventData>('integration:updated', onUpdateIntegration))
  }

  function onUpdateIntegration (data: IntegrationEventData): void {
    if (
      data.integration?.socialId === integration.socialId &&
      data.integration?.workspaceUuid === integration.workspaceUuid
    ) {
      void refresh()
    }
  }

  async function refresh (): Promise<void> {
    try {
      state = await getState(integration.socialId)
    } catch (err: any) {
      console.error('Error refresh gmail state:', err.message)
    }
  }

  $: email = state?.email ?? integration.data?.email
</script>

<BaseIntegrationState {integration} {isLoading} {status} {errorLabel} value={email}>
  <svelte:fragment slot="content">
    {#if state?.isConfigured === true && state?.totalMessages != null}
      <IntegrationStateRow label={gmail.string.TotalMessages} value={state.totalMessages} />
    {/if}
    {#if state?.isConfigured !== true}
      <IntegrationStateRow label={gmail.string.ConfigurationRequired} />
    {/if}
  </svelte:fragment>
</BaseIntegrationState>
