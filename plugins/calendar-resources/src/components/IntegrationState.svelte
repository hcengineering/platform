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

  import { Calendar } from '@hcengineering/calendar'
  import { getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import type { Integration } from '@hcengineering/account-client'
  import calendar from '../plugin'

  export let integration: Integration

  let calendars: Calendar[] = []
  let syncedCalendars: Calendar[] = []
  const query = createQuery()
  query.query(
    calendar.class.ExternalCalendar,
    {
      createdBy: { $in: getCurrentAccount().socialIds },
      externalUser: integration.data?.email
    },
    (res) => {
      calendars = res
      syncedCalendars = calendars.filter((c) => !c.hidden)
    }
  )
</script>

<div class="integration-state">
  <div class="state-content">
    {#if integration.workspaceUuid == null}
      <div class="flex-center" transition:fade={{ duration: 300 }}>
        <span class="text-normal content-color">
          <Label label={calendar.string.NotConnectedIntegration} params={{ email: integration?.data?.email ?? '' }} />
        </span>
      </div>
    {:else if integration.data?.email !== undefined}
      <div class="stats-list" transition:fade={{ duration: 300 }}>
        <div class="stat-row">
          <span class="text-normal content-color font-medium">{integration.data?.email}</span>
        </div>
        <div class="space-divider bottom" />
        {#if syncedCalendars.length === 0}
          <div class="stat-row">
            <span class="text-normal content-color">{calendar.string.NoCalendars}</span>
          </div>
        {:else}
          {#each syncedCalendars as calendar (calendar._id)}
            <div class="stat-row">
              <span class="text-normal content-halfcontent-color">{calendar.name}</span>
            </div>
          {/each}
        {/if}
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

  .state-content {
    display: flex;
    flex-direction: column;
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
  }
</style>
