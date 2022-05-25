<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { EmployeeAccount } from '@anticrm/contact'
  import { getCurrentAccount } from '@anticrm/core'
  import { Table } from '@anticrm/view-resources'
  import { createQuery } from '@anticrm/presentation'
  import { Label, Scroller } from '@anticrm/ui'
  import calendar from '../plugin'

  const currentUser = getCurrentAccount() as EmployeeAccount
  let remindersCount: number = 0

  const query = createQuery()
  $: query.query(calendar.mixin.Reminder, { state: 'active', participants: currentUser.employee }, (res) => {
    remindersCount = res.length
  })
</script>

<div class="selectPopup reminder" class:justify-center={!remindersCount}>
  {#if remindersCount}
    <div class="header fs-title pl-4 pb-2">
      <Label label={calendar.string.Reminders} />
    </div>
    <Scroller>
      <div class="px-4 clear-mins">
        <Table
          _class={calendar.mixin.Reminder}
          config={['']}
          options={{}}
          query={{ state: 'active', participants: currentUser.employee }}
          hiddenHeader
        />
      </div>
    </Scroller>
  {:else}
    <div class="flex-center h-full">
      <Label label={calendar.string.NoReminders} />
    </div>
  {/if}
</div>

<style lang="scss">
  .reminder {
    padding: 0.5rem 0;
    width: fit-content;
    min-width: 16rem;
    min-height: 12rem;
  }
</style>
