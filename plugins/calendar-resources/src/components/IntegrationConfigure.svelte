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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Calendar } from '@hcengineering/calendar'
  import { getCurrentAccount } from '@hcengineering/core'
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { Grid, Label, Toggle, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let integration: Integration

  let calendars: Calendar[] = []
  const query = createQuery()
  query.query(
    calendar.class.ExternalCalendar,
    {
      createdBy: getCurrentAccount()._id,
      externalUser: integration.value
    },
    (res) => {
      calendars = res
    }
  )

  async function update (calendar: Calendar, value: boolean) {
    await getClient().update(calendar, {
      hidden: !value
    })
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={calendar.string.Calendars}
  okAction={() => {
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
      <span>
        <Label label={calendar.string.Calendar} />
      </span>
      <span>
        <Label label={calendar.string.Sync} />
      </span>
      {#each calendars as calendar}
        <div use:tooltip={{ label: getEmbeddedLabel(calendar.name) }} class="lines-limit-2">{calendar.name}</div>
        <Toggle on={!calendar.hidden} on:change={(res) => update(calendar, res.detail)} />
      {/each}
    </Grid>
  </div>
</Card>
