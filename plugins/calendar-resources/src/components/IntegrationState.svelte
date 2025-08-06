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
  import { Calendar } from '@hcengineering/calendar'
  import { getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Integration } from '@hcengineering/account-client'
  import { BaseIntegrationState, IntegrationStateRow } from '@hcengineering/setting-resources'
  import { OK } from '@hcengineering/platform'

  import calendar from '../plugin'

  export let integration: Integration

  let calendars: Calendar[] = []
  let syncedCalendars: Calendar[] = []
  let isLoading = true
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
      isLoading = false
    }
  )
</script>

<BaseIntegrationState {integration} status={OK} {isLoading} value={integration?.data?.email}>
  <svelte:fragment slot="content">
    {#if syncedCalendars.length === 0}
      <IntegrationStateRow label={calendar.string.NoCalendars} />
    {:else}
      {#each syncedCalendars as calendar (calendar._id)}
        <IntegrationStateRow rawLabel={calendar.name} />
      {/each}
    {/if}
  </svelte:fragment>
</BaseIntegrationState>
