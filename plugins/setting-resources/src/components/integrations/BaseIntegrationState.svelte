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
  import { fade } from 'svelte/transition'

  import { Label, Loading, StatusBadge } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'
  import setting from '@hcengineering/setting'

  import { IntlString, Status, ERROR } from '@hcengineering/platform'

  export let integration: Integration
  export let value: string | undefined
  export let isLoading: boolean
  export let status: Status | undefined
  export let errorLabel: IntlString | undefined = undefined
</script>

<div class="integration-state">
  <div class="state-content">
    {#if isLoading && value == null}
      <div class="loading-container">
        <Loading />
      </div>
    {:else if integration.workspaceUuid == null}
      <div class="flex-center" transition:fade={{ duration: 300 }}>
        <span class="text-normal content-color">
          <Label label={setting.string.NotConnectedIntegration} params={{ account: value ?? '' }} />
        </span>
      </div>
    {:else}
      <div class="stats-list" transition:fade={{ duration: 300 }}>
        {#if value != null && value !== ''}
          <div class="stat-row start">
            <div class="status-container">
              {#if status != null}
                <StatusBadge
                  {status}
                  tooltip={errorLabel != null
                    ? { label: errorLabel }
                    : status === ERROR
                      ? { label: setting.string.IntegrationIsUnstable }
                      : undefined}
                />
              {:else if isLoading}
                <Loading size="inline" />
              {/if}
            </div>
            <span class="text-normal content-color font-medium">{value}</span>
          </div>
        {/if}
        <slot name="content" />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .integration-state {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .status-container {
    display: flex;
    width: 0.75rem;
    align-items: center;
  }

  .state-content {
    display: flex;
    flex-direction: column;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 0.15rem 0;
    &.start {
      justify-content: flex-start;
      gap: 0.25rem;
    }
  }
</style>
