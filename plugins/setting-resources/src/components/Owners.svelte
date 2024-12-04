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
  import contact, { formatName } from '@hcengineering/contact'
  import { EmployeePresenter, employeesStore } from '@hcengineering/contact-resources'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Breadcrumb, DropdownIntlItem, DropdownLabelsIntl, SearchInput, Header, Scroller } from '@hcengineering/ui'
  import setting from '../plugin'

  const client = getClient()
  const query = createQuery()
  const currentAccount = getCurrentAccount()

  const items: DropdownIntlItem[] = [
    { id: AccountRole.User, label: setting.string.User },
    { id: AccountRole.Maintainer, label: setting.string.Maintainer },
    { id: AccountRole.Owner, label: setting.string.Owner }
  ]

  let accounts: any = []
  let owners: any = []
  $: owners = accounts.filter((p) => p.role === AccountRole.Owner)

  // TODO: FIXME
  // query.query(contact.class.PersonAccount, {}, (res) => {
  //   owners = res.filter((p) => p.role === AccountRole.Owner)
  //   accounts = res
  // })

  async function change (account: any, value: AccountRole): Promise<void> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // await client.update(account, {
    //   role: value
    // })
  }
  let search = ''

  $: employees = $employeesStore
    .filter((p) => p.active)
    .sort((a, b) => formatName(a.name).localeCompare(formatName(b.name)))
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Owners} label={setting.string.Owners} size={'large'} isCurrent />
    <svelte:fragment slot="search">
      <SearchInput bind:value={search} collapsed />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        {#each employees as employee (employee._id)}
          {@const acc = accounts.find((p) => p.person === employee._id)}
          {#if acc && employee.name?.includes(search)}
            <div class="flex-row-center p-2 flex-no-shrink">
              <div class="p-1 min-w-80">
                <EmployeePresenter value={employee} disabled={false} />
              </div>
              <DropdownLabelsIntl
                label={setting.string.Role}
                disabled={!hasAccountRole(currentAccount, acc.role) ||
                  (acc.role === AccountRole.Owner && owners.length === 1)}
                kind={'primary'}
                size={'medium'}
                {items}
                selected={acc.role}
                on:selected={(e) => {
                  void change(acc, e.detail)
                }}
              />
            </div>
          {/if}
        {/each}
      </div>
    </Scroller>
  </div>
</div>
