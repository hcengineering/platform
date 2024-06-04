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
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { EmployeePresenter, personByIdStore } from '@hcengineering/contact-resources'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Breadcrumb, DropdownIntlItem, DropdownLabelsIntl, EditBox, Header, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let visibleNav: boolean = true

  const dispatch = createEventDispatcher()
  const client = getClient()
  const query = createQuery()
  const currentAccount = getCurrentAccount()

  const items: DropdownIntlItem[] = [
    { id: AccountRole.User, label: setting.string.User },
    { id: AccountRole.Maintainer, label: setting.string.Maintainer },
    { id: AccountRole.Owner, label: setting.string.Owner }
  ]

  let accounts: PersonAccount[] = []
  $: owners = accounts.filter((p) => p.role === AccountRole.Owner)

  query.query(contact.class.PersonAccount, {}, (res) => {
    accounts = res
  })

  async function change (account: PersonAccount, value: AccountRole): Promise<void> {
    await client.update(account, {
      role: value
    })
  }
  let search = ''
</script>

<div class="hulyComponent">
  <Header minimize={!visibleNav} on:resize={(event) => dispatch('change', event.detail)}>
    <Breadcrumb icon={setting.icon.Owners} label={setting.string.Owners} size={'large'} isCurrent />
    <EditBox kind={'search-style'} focusIndex={1} bind:value={search} placeholder={presentation.string.Search} />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        {#each accounts as account (account._id)}
          {@const employee = $personByIdStore.get(account.person)}
          {#if employee?.name?.includes(search)}
            <div class="flex-row-center p-2 flex-no-shrink">
              <div class="p-1 min-w-80">
                {#if employee}
                  <EmployeePresenter value={employee} disabled={false} />
                {:else}
                  {account.email}
                {/if}
              </div>
              <DropdownLabelsIntl
                label={setting.string.Role}
                disabled={!hasAccountRole(currentAccount, account.role) ||
                  (account.role === AccountRole.Owner && owners.length === 1)}
                kind={'primary'}
                size={'medium'}
                {items}
                selected={account.role}
                on:selected={(e) => {
                  void change(account, e.detail)
                }}
              />
            </div>
          {/if}
        {/each}
      </div>
    </Scroller>
  </div>
</div>
